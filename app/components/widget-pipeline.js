import Ember from 'ember';
import Widget from 'ember-eureka/widget';

const SEQUENCE_EXAMPLE = `>user1
CAAATCTACAATGTAATTGTCACAGCCCATGCATTCGTAATAATTTTCTTTATAGTTATGCCAATAATGATTGGTGGTTTCGGAAACTGATTAGTCCCCTTAATAATTGGAGCCCCTGATATAGCATTTCCACGAATAAATAATATAAGCTTTTGACTCCTTCCACCATCATTCCTTCTTCTGTTAGCATCTTCTATGGTAGAAGCCGGAGCAGGAACAGGATGAACAGTATACCCACCATTAGCTGGAAATTTAGCCCACGCTGGAGCATCAGTAGACCTAACCATTTTCTCCCTCCACCTGGCTGGGGTATCCTCTATTTTAGGGGCTATTAACTTTATTACTACTATTATTAATATGAAACCACCCGCTATAACTCTATGG
>user2
GGACAACCAGGTGCACTTCTAGGAGATGACCAAATTTATAATGTTATTGTAACTGCCCATGCATTCGTAATAATTTTTTTTATAGTTATACCAATAATAATTGGAGGCTTCGGAAACTGACTTGTACCACTAATAATTGGAGCCCCAGATATAGCATTTCCACGAATAAATAATATAAGCTTTTGACTACTTCCCCCATCTTTCCTCCTTCTTCTAGCATCATCTATAGTAGAAGCAGGAGCAGGAACGGGATGAACAGTTTACCCCCCTCTAGCTGGAAATTTAGCTCATGCAGGAGCATCAGTAGACCTAACAATTTTCTCCCTCCATTTAGCTGGTGTTTCATCTATTCTAGGTGCAATCAACTTTATTACTACAATTATTAACATAAAACCCCCAGCTATAACTCAATATCAAACCCCGCTATTTGTTTGATCAGTACTAATTACTGCCGTATTACTTTTACTATCCCTACCAGTTCTAGCTGCAGGAATTACTATACTGCTAACAGACCGTAACCTTAATACAACTTTCTTTG
>user3
GGACAGCCAGGCGCACTACTAGGAGATGACCAAATTTATAATGTTATTGTTACCGCCCATGCATTTGTTATAATCTTTTTTATAGTAATGCCAATAATAATCGGAGGTTTCGGAAACTGACTTGTACCACTAATAATTGGAGCCCCAGATATAGCATTCCCACGAATAAATAATATAAGTTTTTGACTACTTCCCCCATCATTTCTTCTCCTATTAGCATCATCAATAGTAGAAGCTGGGGCAGGAACAGGATGAACAGTCTACCCACCTCTAGCCGGAAATTTAGCCCATGCAGGAGCATCTGTAGATTTAACAATTTTTTCTCTACATTTAGCCGGTGTCTCATCTATTTTAGGTGCAATCAACTTTATTACAACAATTATTAATATAAAACCCCCAGCTATAACTCAGTATCAAACCCCACTATTTGTCTGATCCGTATTAATTACAGCTGTATTACTTTTATTATCACTGCCGGTATTAGCTGCAGGAATTACTATACTATTAACAGACCGAAATCTTAATACAACTTTCTTTG`;

export default Widget.extend({

    apiEndpoint: Ember.computed(function() {
        return this.get('appConfig.apiEndpoint');
    }),

    sequence: '',
    isLoading: false,
    nwk: null,
    userIndividualNames: Ember.computed(function() {
        return Ember.A();
    }),
    voucherBarcodings: Ember.computed(function() {
        return Ember.A();
    }),

    postSequence(formData) {
        let {Promise} = Ember.RSVP;
        let apiEndpoint = this.get('apiEndpoint');
        this.$('.nav-tabs a[href=#tab-results]').tab('show');
        this.set('isLoading', true);
        this.set('imagePath', null);
        let nwkPromise = new Promise((resolve, reject) => {
            Ember.$.ajax({
                url: `${apiEndpoint}/pipeline`,
                type: 'POST',
                data: formData,
                cache: false,
                contentType: false,
                processData: false,
                success(response) {
                    resolve(response);
                },
                error(err) {
                    reject(err);
                }
            });
        });

        let voucherBarcodingPromise = new Promise((resolve, reject) => {
            let url = `${apiEndpoint}/individuals/i/stream/json?fields=title,taxonomyID&filter[isVoucherBarcoding]=true&limit=10000`;

            Ember.$.ajax({
                url: encodeURI(url),
                dataType: 'json',
                async: true,
                success(data) {
                    let result = {};
                    data.data.forEach((item) => {
                        result[item._id] = item.taxonomyID._id;
                    });
                    resolve(result);
                },
                error(err) {
                    reject(err);
                }
            });
        });

        Promise.all([nwkPromise, voucherBarcodingPromise]).then((results) => {
            console.log(results);
            this.set('isLoading', false);
            this.setProperties({
                nwk: results[0].nwk,
                userIndividualNames: results[0].userIndividuals,
                voucherBarcodings: results[1]
            });
        }).catch((err) => {
            this.set('isLoading', false);
            if (err.readyState === 0) {
                this.set('error', 'cannot connect to server');
            } else {
                this.set('error', err.responseJSON.errors[0].detail);
            }
        });
    },

    actions: {
        example() {
            this.set('sequence', SEQUENCE_EXAMPLE);
        },

        sequenceReset() {
            this.set('sequence', '');
            this.setProperties({'nwk': null, error: null});
        },

        sequenceSubmit() {
            this.setProperties({'nwk': null, error: null});
            let value = this.get('sequence');
            if (value.trim()) {
                let data = new FormData();
                data.append('sequence', value);
                this.postSequence(data);
            }
        },

        fileReset() {
            Ember.$('#pipeline-file').val(null);
            this.setProperties({'nwk': null, error: null});
        },

        fileSubmit() {
            this.setProperties({'nwk': null, error: null});
            let files = Ember.$('#pipeline-file')[0].files;

            if (files.length) {
                let data = new FormData();
                data.append('file', files[0]);
                this.postSequence(data);
            }
        }
    }

});
