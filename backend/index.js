
var eureka = require('eurekajs');
var config = require('../config/server');
var mimes = require('mime-types');

var _ = require('lodash');
var joi = require('joi');
var kue = require('kue');
var os = require('os');
var path = require('path');
var url = require('url');


var pump = require('pump');
var csv = require('csv-stream');
var shell = require('shelljs');
var archimedesUtils = require('archimedes/lib/adapters/rdf/utils');
var fs = require('fs');


var eurekaServer = eureka(config);

eurekaServer.beforeRegister = function(_server, next) {
    _server.on('log', function(message) {
        console.log(message.tags, message.data);
    });
    next(null);
};

var queue = kue.createQueue({
    redis: {
        port: config.misc.redis.port,
        host: config.misc.redis.host
    }
});

queue.on( 'error', function( err ) {
  console.log( 'Oops... ', err );
});

eurekaServer.start().then(function(server) {

    queue.process('importCSV', 1, function(job, done) {
        var infile = fs.createReadStream(job.data.filename);

        var parsedFileName = path.parse(job.data.filename);
        var outfileName = path.resolve(os.tmpDir(), parsedFileName.name+'.trig');

        var outfile = fs.createWriteStream(outfileName);
        var db = server.plugins.eureka.database;

        // All of these arguments are optional.
        var options = {
          delimiter: ',', // default is ,
          endLine: '\n', // default is \n,
          //  columns : ['columnName1', 'columnName2'] // by default read the first line and use values found as columns
          escapeChar: '"', // default is an empty string
          enclosedChar: '"' // default is an empty string
        };

        var csvTransform = csv.createStream(options);
        var instanceTransform = archimedesUtils.instanceStreamWriter(db, job.data.resource);
        var rdfTransform = archimedesUtils.rdfStreamWriter(job.data.graphUri);

        var output = shell.exec('wc -l '+job.data.filename, {silent: true}).output;
        var total = parseFloat(_.trim(output).split(' ')[0]);

        var progress = 0;
        rdfTransform.on('data', function() {
            progress++;
            job.progress(progress, total);
        });

        rdfTransform.on('error', function(error) {
            console.log('rdfTransform:error', error.stack);
            done(error);
        });

        pump(infile, csvTransform, instanceTransform, rdfTransform, outfile, function(err) {
            if (err) {
                console.error('pump:error:', err.stack);
                return done(err);
            }

            var graphUri = config.database.config.graphUri;

            db.clearResource(job.data.resource).then(function() {
                encodedGraphUri = encodeURIComponent(graphUri);
                var url = 'db:8890/sparql-graph-crud-auth?graph-uri='+encodedGraphUri;
                var dbPassword = config.misc.virtuoso.password;
                shell.exec(
                    'curl --digest --user dba:'+dbPassword+' --url "'+url+'" -X POST -T '+outfileName+' --fail --silent --show-error 1>/dev/null',
                    // {silent: true},
                    function(code, stdout, stderr) {
                        if (code === 0) {
                            done(null, 'done');
                        } else {
                            done(new Error(stdout));
                        }
                    }
                );

            }).catch(function(error) {
                console.log('clearResource:error:', error);
                console.log(error.stack);
                done(error);
            });
        });
    });

    var uploadSecretKey = config.app.secret;

    server.route({
        path: '/_private/resources',
        method: 'GET',
        config: {
            validate: {
                query: {
                    persist: joi.string()
                }
            }
        },
        handler: function(request, reply) {
            // if (request.query.persist !== uploadSecretKey) {
                // return reply.forbidden('not authorized');
            // }
            return reply.ok({
                resources: Object.keys(request.db.registeredModels)
            });
        }
    }),

    server.route({
        path: '/_private/import/{resource}',
        method: 'POST',
        config: {
            validate: {
                query: {
                    persist: joi.string(),
                    delimiter: joi.string().default(','),
                    escapeChar: joi.string(),
                    enclosedChar: joi.string()
                }
            },
            payload: {
                output: 'stream',
                parse: true,
                maxBytes: 100 * Math.pow( 1024, 2), // 100 Mo
                allow: 'multipart/form-data'
            }
        },
        handler: function(request, reply) {
            // if (request.query.persist !== uploadSecretKey) {
                // return reply.forbidden('not authorized');
            // }

            var csvOptions = {
                delimiter: request.query.delimiter,
                escapeChar: request.query.escapeChar,
                enclosedChar: request.query.enclosedChar
            };
            var resource = request.params.resource;
            var modelName = _.capitalize(_.camelCase(request.params.resource));
            var db = request.db;
            if (!db[modelName]) {
                return reply.badRequest('unknown resource: "' + resource + '"');
            }

            var file = request.payload.file;
            if (!file && file.hapi) {
                return reply.badRequest('file not found');
            }

            var mimeType = mimes.lookup(file.hapi.filename);
            if (mimeType !== 'text/csv') {
                return reply.badRequest('the file should be in csv format');
            }

            var csvFileName = path.resolve(os.tmpDir(), file.hapi.filename);

            var csvFile = fs.createWriteStream(csvFileName);

            request.payload.file.pipe(csvFile);

            request.payload.file.on('error', function(error) {
                reply.badRequest(error);
            });

            request.payload.file.on('end', function() {
                var job = queue.create('importCSV', {
                    title: resource,
                    filename: csvFileName,
                    resource: modelName
                }).save();

                job.on('enqueue', function() {
                    reply('ok');
                });
            });
        }
    });


    server.route({
        path: '/_private/validate/{resource}',
        method: 'POST',
        config: {
            validate: {
                query: {
                    persist: joi.string(),
                    delimiter: joi.string().default(','),
                    escapeChar: joi.string(),
                    enclosedChar: joi.string()
                }
            },
            payload: {
                output: 'stream',
                parse: true,
                maxBytes: 100 * Math.pow( 1024, 2), // 100 Mo
                allow: 'multipart/form-data'
            }
        },
        handler: function(request, reply) {
            var csvOptions = {
                delimiter: request.query.delimiter,
                escapeChar: request.query.escapeChar,
                enclosedChar: request.query.enclosedChar
            };
            var resource = request.params.resource;
            var modelName = _.capitalize(_.camelCase(request.params.resource));
            var db = request.db;
            if (!db[modelName]) {
                return reply.badRequest('unknown resource: "' + resource + '"');
            }
            var file = request.payload.file;

            if (!file || !file.hapi) {
                return reply.badRequest('file not found');
            }

            var mimeType = mimes.lookup(file.hapi.filename);

            if (mimeType !== 'text/csv') {
                return reply.badRequest('the file should be in csv format');
            }

            var promise = new Promise(function(resolve, reject) {

                var csvStream = db.csvStreamParse(modelName, file, csvOptions);
                var writableStream = db.writableStream(modelName, {dryRun: true, stripUnknown: true});
                csvStream.pipe(writableStream);

                csvStream.on('error', function(err) {
                    // console.error('xxx', err);
                    reject(err);
                });

                writableStream.on('error', function(err) {
                    // console.error('---', err);
                    reject(err);
                });

                writableStream.on('end', function() {
                    // console.log('finished');
                    resolve();
                });

                request.payload.file.on('error', function(err) {
                    // console.error('***', err);
                    reject(err);
                });
            });

            promise.then(function() {
                reply.jsonApi({data: {sucess: true}});
            }).catch(function(err) {
                if (err.message === 'Bad value') {
                    var lineNumber = parseFloat(err.line.count) + 1;
                    return reply.badRequest('error at line ' + lineNumber, err);
                } else {
                    return reply.badRequest(err.message, err);
                }

            });
        }
    });


    /* redirect from /rdbsea */
    server.route({
        path: '/rdbsea/pipeline',
        method: 'GET',
        handler: function(request, reply) {
            return reply.redirect('/');
        }
    });

    server.route({
        path: '/rdbsea/species',
        method: 'GET',
        handler: function(request, reply) {
            return reply.redirect('/rodentia-taxonomy');
        }
    });

    server.route({
        path: '/rdbsea/species/{speciesName}/{restpath*}',
        method: 'GET',
        handler: function(request, reply) {
            var speciesName = request.params.speciesName;
            speciesName = speciesName.split(' ').join('-').toLowerCase();
            var redirectUrl = '/rodentia-taxonomy/'+speciesName;

            var restpath = request.params.restpath;

            if (restpath === 'sampling_map') {
                restpath = 'map';
            } else if (restpath === 'measurements') {
                restpath = 'measurements';
            } else if (restpath === 'vouchers') {
                restpath = 'vouchers';
            } else if (restpath === 'individuals') {
                restpath = 'individuals';
            } else {
                restpath = null;
            }
            if (restpath) {
                redirectUrl += '/'+restpath;
            }

            return reply.redirect(redirectUrl);
        }
    });

    server.route({
        path: '/rdbsea/individual',
        method: 'GET',
        handler: function(request, reply) {
            return reply.redirect('/individual');
        }
    });

    server.route({
        path: '/rdbsea/individual/{individualID}/{restpath*}',
        method: 'GET',
        handler: function(request, reply) {
            var individualID = request.params.individualID;
            var redirectUrl = '/individual/'+individualID;

            return reply.redirect(redirectUrl);
        }
    });

    server.route({
        path: '/rdbsea/parasites',
        method: 'GET',
        handler: function(request, reply) {
            return reply.redirect('/helminths-taxonomy');
        }
    });

    server.route({
        path: '/rdbsea/parasites/{restpath*}',
        method: 'GET',
        handler: function(request, reply) {
            return reply.redirect('/helminths-taxonomy');
        }
    });

    server.log('info', 'Server running at: http://' + server.info.address + ':' + server.info.port);
}).catch(function(error) {
    console.log(error);
    console.log(error.stack);
    throw error;
});
