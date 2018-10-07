const chalk = require('chalk');

module.exports = function()
{
    
    // Self

    var self = this;

    // Public members

    self.ok = chalk.green;
    self.emphasize = chalk.bold;
    self.error = chalk.red;

    // Public methods

    self.info = function(text)
    {
        return chalk.yellowBright(chalk.bold('INFO: ') + text);
    }

    self.wait = function(milliseconds)
    {
        return new Promise(function(resolve, reject)
        {
            setTimeout(resolve, milliseconds);
        });
    };

    self.test =
    {
        summary: function(t, results)
        {
            var failed = 0;
            for (var i in results)
            {
                if (results[i]["ret"] !== 0)
                {
                    failed++;
                    console.log(self.error('Instance ' + i + ' failed:'));
                    console.log(results[i]["out"]);
                }
            }

            if (failed !== 0)
            {
                var s = '\'' + t + '\'' + self.emphasize(' failed ') + 'on ' + failed + ' instance';
                s += failed === 1 ? '.' : 's.';
                console.log(self.error(s));
            }
            else
                console.log(self.ok('\''+ t + '\'' + self.emphasize(' passed ') + 'on all instances.'));
        }
    };
};
