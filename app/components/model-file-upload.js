import Ember from 'ember';

export default Ember.Component.extend({
    tagName: 'tr',
    classNameBindings: ['trClass'],

    trClass: Ember.computed('resource.status', function() {
        let status = this.get('resource.status');
        if (status === 'error') {
            return 'danger';
        } else if (status === 'skipped') {
            return 'warning';
        } else if (status === 'ok') {
            return 'success';
        }
        return '';
    }),

    error: null,
    isLoading: false,

    resource: null,

    file: null,

    disabledFileInput: Ember.computed('resource.status', function() {
        if (this.get('resource.status')) {
            return 'disabled';
        }
        return '';
    }),

    actions: {
        reset() {
            this.setProperties({
                file: null,
                isLoading: false,
                error: null,
            });
            let resource = this.get('resource');
            resource.setProperties({
                file: null,
                status: null
            });
            this.sendAction('changed', resource);
        },

        skip() {
            let resource = this.get('resource');
            resource.setProperties({
                status: 'skipped',
                file: null
            });
            this.sendAction('changed', resource);
        },

        submit() {
            let resourceName = this.get('resource.name');
            let file = this.get('file');

            if (file) {
                this.set('isLoading', true);
                let data = new FormData();
                data.append('file', file);
                let url = `/_private/validate/${resourceName}`;

                let that = this;
                Ember.$.ajax({
                    url: url,
                    type: 'POST',
                    data: data,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success() {
                        that.set('isLoading', false);
                        let resource = that.get('resource');
                        resource.setProperties({
                            file: file,
                            status: 'ok'
                        });
                        that.sendAction('changed', resource);
                    },
                    error(err) {
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

                        that.setProperties({
                            isLoading: false,
                            error: error
                        });
                        let resource = that.get('resource');
                        resource.set('status', 'error');
                        that.sendAction('changed', resource);
                    }
                });
            }
        }
    }

});
