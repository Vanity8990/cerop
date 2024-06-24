import Ember from 'ember';
const {Promise} = Ember.RSVP;

import config from '../config/environment';

export default Ember.Component.extend({

    init() {
        this._super();
        // window.Offline.check();
        // setTimeout(function() {
        //     if (window.Offline.state === 'down') {
        //         window.setInterval(function() {
        //             if (window.Offline.state === 'up') {
        //                 window.location.reload();
        //             }
        //         }, 1000);
        //     }
        // }, 3000);
    },

    resourcesLoaderObserver: Ember.on('init', function() {
        console.log(config.APP);
        let url = `/_private/resources?persist=${config.APP.secret}`;

        let that = this;
        Ember.$.ajax({
            url: url,
            type: 'GET',
            contentType: false,
            processData: false,
            success(data) {
                let resources = Ember.A(data.resources.map((resourceName) => {
                    return Ember.Object.create({name: resourceName, status: null, file: null});
                }));
                that.set('resources', resources);
            },
            error(err) {
                console.error(err);
            }
        });
    }),


    // offline: Ember.inject.service(),

    complete: false,
    error: null,
    isLoading: false,

    isReadyForUpload: false,

    checkIfReadyForUpload: function() {
        this.set('complete', false);

        let resources = this.get('resources');
        let skippedResources = resources.filterBy('status', 'skipped');
        let okResources = resources.filterBy('status', 'ok');

        let ready = skippedResources.length + okResources.length === resources.length;

        this.set('isReadyForUpload', ready);
    },

    processFile(resource) {
        return new Promise((resolve, reject) => {
            let data = new FormData();
            data.append('file', resource.file);
            let url = `/_private/import/${resource.name}?persist=${config.APP.secret}`;

            Ember.$.ajax({
                url: url,
                type: 'POST',
                data: data,
                cache: false,
                contentType: false,
                processData: false,
                success() {
                    resolve();
                },
                error(err) {
                    reject(err);
                }
            });
        });
    },

    actions: {
        updateResource(resource) {
            let resources = this.get('resources');
            let props = resource.getProperties(['name', 'file', 'status']);
            let oldResource = resources.findBy('name', props.name);
            oldResource.setProperties({
                file: props.file,
                status: props.status
            });
            this.checkIfReadyForUpload();
        },

        upload() {
            this.setProperties({
                isLoading: true,
                error: null
            });
            if (!this.get('isReadyForUpload')) {
                return;
            }

            let promises = this.get('resources').map((resource) => {
                if (resource.get('status') === 'ok') {
                    return this.processFile(resource);
                }
            });

            Promise.all(promises).then(() => {

                this.setProperties({
                    isLoading: false,
                    complete: true
                });

            }).catch((err) => {

                let error;
                if (err.readyState === 0) {
                    error = {message: 'cannot connect to server'};
                } else {
                    err = err.responseJSON.errors[0];
                    let message = err.detail;
                    let detail = err.meta && err.meta.infos.extra || null;
                    error = {
                        message: message,
                        detail: detail
                    };
                }

                this.setProperties({
                    isLoading: false,
                    error: error,
                    complete: true
                });
            });
        }
    }
});
