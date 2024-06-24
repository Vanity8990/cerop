
var fs = require('fs');
var path = require('path');
var os = require('os');
var childProcess = require('child_process');
var uuid = require('uuid');
var rimraf = require('rimraf');
var _ = require('lodash');
var biojs = require('biojs-io-newick');

var processNewickTree = function(tree) {
    if (_.isArray(tree.children)) {
        tree.children.forEach(function(child) {
            processNewickTree(child);
        });
    } else {
        tree.name = tree.name.split('_')[0].toLowerCase();
    }
};


module.exports = function() {

    var PIPELINE_TMP_DIR = os.tmpDir();
    /** create the upload directory if needed **/
    try {
        fs.mkdirSync(PIPELINE_TMP_DIR);
        console.log('creating pipeline temporary direcotry', PIPELINE_TMP_DIR);
    } catch(error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }

    var PIPELINE_SVG_DIR = path.resolve('./uploads/pipeline');
    /** create the pipeline assets directory if needed **/
    try {
        fs.mkdirSync(PIPELINE_SVG_DIR);
        console.log('creating pipeline assets direcotry', PIPELINE_SVG_DIR);
    } catch(error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }


    return {
        routes: {
            upload: {
                method: 'POST',
                path: '/',
                handler: function(request, reply) {
                    var sequence = request.payload.sequence;

                    if (!sequence && request.payload.file) {
                        sequence = request.payload.file.toString();
                    }


                    if (!sequence) {
                        return reply.badRequest();
                    }

                    if (sequence) {

                        var userIndividuals = _.compact(sequence.split('>').map(function(item) {
                            return item.split('\n')[0].trim();
                        }));


                        var dirUID = uuid.v4();
                        var dirpath = path.join(PIPELINE_TMP_DIR, dirUID);

                        /** create the user temporary directory if needed **/
                        try {
                            fs.mkdirSync(dirpath);
                        } catch(error) {
                            if (error.code !== 'EEXIST') {
                                throw error;
                            }
                        }

                        var filepath = path.join(dirpath, 'sequence.fas');

                        var options = {
                            cwd: dirpath
                        };

                        var cmdPath = path.resolve('./bin/pipeline.sh');
                        fs.writeFile(filepath, sequence, function() {
                            childProcess.exec('sh ' + cmdPath + ' sequence.fas', options, function(err, stdout, stderr) {
                                if (err) {
                                    return reply.badRequest(stderr);
                                }

                                var nwkPath = path.resolve(dirpath, 'final.nwk');
                                fs.readFile(nwkPath, function(readErr, buffer) {
                                    if (readErr) {
                                        return reply.badImplementation(readErr);
                                    }

                                    var nwk = buffer.toString();

                                    var jsontree = biojs.parse_newick(nwk);
                                    processNewickTree(jsontree);
                                    nwk = biojs.parse_json(jsontree);

                                    var rep = reply.ok({
                                        nwk: nwk,
                                        userIndividuals: userIndividuals
                                    });

                                    rep.once('finish', function() {
                                        rimraf(dirpath, function(repErr) {
                                            if (repErr) {
                                                console.error(repErr);
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    }
                }
            }
        }
    };
};