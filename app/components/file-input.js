import Ember from 'ember';

export default Ember.TextField.extend({
    type: 'file',
    attributeBindings: ['disabled'],

    file: null,

    fileObserver: Ember.observer('file', function() {
        if (this.get('file') == null) {
            this.$().val(null);
        }
    }),

    change(evt) {
        let files = evt.target.files;
        if (files.length) {
            this.set('file', files[0]);
            this.sendAction('onChange');
        }
    }
});
