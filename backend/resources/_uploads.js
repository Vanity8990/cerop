
var fileResource = require('eurekajs/lib/contrib/file-resource');

module.exports = function(options) {
    var resource = fileResource(options);
    /** everyone can upload an download a file **/
    // resource.auth = false;
    return resource;
};