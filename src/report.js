const fs = require('fs-extra');
const path = require('path');

module.exports = function()
{

    // Self

    var self = this;

    // Members

    const success = '63, 191, 63, 0.4';
    const fail = '191, 74, 63, 0.4';

    // Methods

    var main =
    {
        start: function()
        {
            return '<html><head><title> Beaver Report </title> </head><body> \n\
                    <table style="border-collapse: collapse; text-align: center; width: 90%; margin: 5%; table-layout: fixed"><thead> \n\
                    <tr><th></th><th colspan="3" style="padding-bottom: 10px" > Instances </th></tr> \n\
                    <tr><th> Test </th><th> Total </th><th> Passing </th><th> Failing </th></tr> \n\
                    </thead><tbody>\n';
        },

        row: function(tpath, t, passing, failing)
        {
            var html = '<tr style="background-color: rgba(';
            html += failing === 0 ? success : fail;
            html += ')"> \n\
                    <td><a href="./' + tpath + '.html">' + t + ' </a></td> \n\
                    <td>' + (passing + failing) + '</td><td>' + passing + '</td><td>' + failing + '</td>\n';

            return html;
        },

        end: function()
        {
            return '</tbody></table> \n\
                    </body></html>\n';
        }
    };

    var test =
    {
        start: function(t)
        {
            return '<html><head><title> Beaver Report </title> </head> \n\
                    <body style="margin: 5%"> \n\
                    <h2>' + t + '</h2>\n';
        },

        instance: function(tpath, i, passing)
        {
            var html = '<span style="text-align: center; background-color: rgba(';
            html += passing ? success : fail;
            html += '); width: 75px; padding: 5px; display: inline-block; margin-bottom: 3px" > \n\
                     <a href="' + tpath + '"/>Instance ' + i + '</a> \n\
                     </span>\n'

            return html;
        },

        end: function()
        {
            return '</body></html>\n';
        }
    };

    // Public methods

    self.generate = async function(results)
    {
        await fs.remove('./report');

        await fs.outputFile('./report/index.html', main.start());
        var index = fs.createWriteStream('./report/index.html', {'flags': 'a'});

        for (t in results)
        {
            tpath = t.replace(/\//g, '-');
            await fs.outputFile('./report/'+ t + '.html', test.start(t));
            var test_index = fs.createWriteStream('./report/'+ t + '.html', {'flags': 'a'});

            var failing = 0;
            var passing = 0;
            for (i in results[t])
            {
                var tpath = './report/' + t + '/instance_' + i + '.html';
                fs.outputFile(tpath, '<html><head><h1>' + t + ' - Instance ' + i + '</h1></head>' + '<body><p>' + results[t][i]["out"] + '</p></body></html>\n', () => {});

                if (results[t][i]["ret"] === 0)
                    passing++;
                else
                    failing++;

                const rel_path = './' + t.split("/").slice(-1)[0] + '/instance_' + i + '.html'
                test_index.write(test.instance(rel_path, i, results[t][i]["ret"] === 0));
            }

            test_index.end(test.end());
            index.write(main.row(t, t, passing, failing));
        }

        index.end(main.end());
    };
}
