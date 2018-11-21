const dockerode = require('dockerode');
const stream = require('stream');
const _utils = require('./utils.js');

var utils = new _utils();

module.exports = function ()
{

    // Self

    var self = this;

    // Members

    var containers = [];
    var docker = new dockerode();

    // Public methods

    self.container =
    {
        start: async function(name, code_path)
        {
            var container = await docker.createContainer
            ({
                Image: 'rainvg/beaver',
                name: name,
                Tty: true,
                Cmd: '/bin/bash',
                Volumes: {'/code': {}},
                HostConfig: {Binds: [code_path + ':/code']}
            });

            await container.start();
            containers.push(container);

            return container;
        },

        close: async function(i=0, splice=true)
        {
            await containers[i].stop();
            await containers[i].remove();

            if (splice)
                containers.splice(i, 1);
        },

        cleanup: async function()
        {
            var promises = [];
            const n = containers.length;
            for (var i = 0; i < n; i ++)
                promises.push(this.close(i=i, splice=false));

            await Promise.all(promises);
        }
    };

    self.test =
    {
        setup: async function(configuration, volume_path)
        {
            var max_instances = 0;
            for (var test in configuration)
                max_instances = Math.max(configuration[test]["instances"], max_instances);

            var promises = [];
            for (var i = 0; i < max_instances; i++)
                promises.push(self.container.start('beaver-instance-' + i, volume_path));

            await Promise.all(promises);
        },

        run: async function(configuration)
        {
            var fail = 0
            var results = {};
            for (var t in configuration)
            {
                console.log(utils.info('Running test ' + '\'' + t + '\'...'));
                const cmd = ['bash', '-c', './test run ' + t];

                var promises = []
                for (var i = 0; i < configuration[t]["instances"]; i++)
                {
                    promises.push(self.exec.run(containers[i], cmd));
                }

                results[t] = await Promise.all(promises).then();
                fail += results[t]['ret']

                await utils.test.summary(t, results[t]);
            }

            return {results: results, failures: fail};
        }
    };

    self.exec =
    {
        run: async function(container, commands, log=false)
        {
            var exec = await container.exec
            ({
                Cmd: commands,
                WorkingDir: '/code',
                AttachStdout: true,
                AttachStderr: true,
            });

            var out = "";

            var myStream = new stream.PassThrough();
            myStream.on('data', function(chunk) {
                out += chunk;
                if (log)
                    process.stdout.write(chunk);
            });

            await exec.start(async function(err, stream) {
                container.modem.demuxStream(stream, myStream, myStream);
            });

            const ret = await this.wait(exec);

            return {
                "ret": ret,
                "out": out
            };
        },

        wait: async function(e)
        {
            var data = await e.inspect();

            while(true)
            {
                if(data.ExitCode !== null)
                    break;

                await utils.wait(100);
                data = await e.inspect();
            }

            return data.ExitCode;
        }
    };
};
