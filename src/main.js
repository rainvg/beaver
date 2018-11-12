const path = require('path');
const _utils = require('./utils.js');
const _dockerode = require('./dockerode.js');
const _report = require('./report.js');

var utils = new _utils();
var dockerode = new _dockerode();
var report = new _report();

(async function()
{
    code = 0;

    try
    {
        if (process.argv.length !== 3)
            throw utils.error('Beaver needs exactly 1 arument (the path to the code folder).');

        console.log(utils.info('Setting up main container...'));
        const volume_path = path.resolve(process.argv[2]);

        var container = await dockerode.container.start('beaver-main', volume_path);

        console.log(utils.info('Building project...'));

        const cmd_buckaroo = ['bash', '-c', 'buckaroo install'];
        var buckaroo_ret = await dockerode.exec.run(container, cmd_buckaroo, true);
        if (buckaroo_ret["ret"] !== 0)
            throw '`buckaroo install` failed.';

        await container.putArchive('./assets/buckconfig.local.tar', {
            path: '/code',
            noOverwriteDirNonDir: false
        });

        const cmd_build = ['buck', 'build', ':test', '--out', '/code/test'];
        var build_ret = await dockerode.exec.run(container, cmd_build, true);
        if (build_ret["ret"] !== 0)
            throw '`buck build :test` failed.';

        console.log(utils.info('Retrieving test configuration...'));
        const cmd_run_test = ['bash', '-c', './test configuration'];
        var test_ret = await dockerode.exec.run(container, cmd_run_test);
        if (test_ret["ret"] !== 0)
            throw test_ret["ret"] + ': ' + ["out"]

        const configuration = JSON.parse(test_ret["out"]);

        await dockerode.container.close();

        console.log(utils.info('Setting up test containers...'));
        const instances = await dockerode.test.setup(configuration, volume_path);

        const results = await dockerode.test.run(configuration);

        console.log(utils.info('Writing report files...'));
        await report.generate(results);
    }
    catch (e)
    {
        var err = (e.name && e.message) ? (e.name + ': '  + e.message) : utils.emphasize('ERR: ') + e;

        console.log(utils.error(err));

        code = 1;
    }
    finally
    {
        console.log(utils.info('Cleaning up...'));
        await dockerode.container.cleanup();

        process.exit(code);
    }
})();
