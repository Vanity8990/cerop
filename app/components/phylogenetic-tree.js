
import Ember from 'ember';
import tnt from 'ember-tnt';

export default Ember.Component.extend({
    classNames: ['phylogenetic-tree'],

    nwk: null,

    userIndividuals: Ember.computed(function() {
        return Ember.A();
    }),

    voucherBarcodings: Ember.computed(function() {
        return Ember.A();
    }),


    didInsertElement: function() {
        let nwk = this.get('nwk');

        if (nwk) {
            let treeVis = tnt.tree().data(tnt.tree.parse_newick(nwk));
            let userIndividuals = this.get('userIndividuals');

            let voucherBarcodings = this.get('voucherBarcodings');

            let root = treeVis.root();

            root.apply(function(node) {
                var hasUser = node.present(function(item) {
                    return userIndividuals.indexOf(item.node_name()) > -1;
                });

                if (!node.is_leaf() && !hasUser) {
                    node.toggle();
                }
            });

            root.get_all_leaves().forEach((node) => {
                let brothers = node.parent().children();
                let isBrother = false;
                brothers.forEach((brother) => {
                    if (userIndividuals.indexOf(brother.node_name()) > -1) {
                        isBrother = true;
                    }
                });
                if (node.is_collapsed() && isBrother) {
                    node.toggle();
                }
            });

            var expandedNode = tnt.tree.node_display.circle()
                .size(6)
                .fill('lightgrey');
            var collapsedNode = tnt.tree.node_display.triangle()
                .size(6)
                .fill('lightgrey');
            let userNode = tnt.tree.node_display.circle()
                .size(6)
                .fill('red');
            let voucherNode = tnt.tree.node_display.circle()
                .size(4)
                .fill('#7A0329');


            let individualLabel = tnt.tree.label.text()
                .text(function (node) {
                    return node.node_name();
                })
                .fontsize(20)
                .color('#337ab7')
                .on('click', function(node) {
                    window.open(`/individual/${node.node_name()}`);
                });

            let speciesLabel = tnt.tree.label.text()
                .text(function (node) {
                    let name = node.node_name();
                    let taxonomyId = voucherBarcodings[name];
                    if (taxonomyId) {
                        let taxonomyName = taxonomyId.split('-');
                        taxonomyName[0] = taxonomyName[0].capitalize();
                        taxonomyName = taxonomyName.join(' ');
                        return `${taxonomyName}`;
                    } else {
                        return '';
                    }
                })
                .color('#7A0329')
                .fontsize(20)
                .on('click', function(node) {
                    let taxonomyId = voucherBarcodings[node.node_name()];
                    if (taxonomyId) {
                        window.open(`/rodentia-taxonomy/${taxonomyId}`);
                    }
                });

            let label = tnt.tree.label.composite()
                .add_label(individualLabel)
                .add_label(speciesLabel);


            treeVis
                .node_display(treeVis.node_display()
                    .size(4)
                    .display(function (node) {
                        if (userIndividuals.indexOf(node.node_name()) > -1) {
                            userNode.display().call(this, node);
                        } else if (voucherBarcodings[node.node_name()]) {
                            voucherNode.display().call(this, node);
                        } else if (node.is_collapsed()) {
                            collapsedNode.display().call(this, node);
                        } else {
                            expandedNode.display().call(this, node);
                        }
                    })
                )
                .label(label)
                .layout(tnt.tree.layout.vertical()
                    .width(650)
                    .scale(false)
                );

            treeVis.on('click', function(node){
                if ((node.is_leaf() && node.is_collapsed() || !node.is_collapsed())) {
                    node.toggle();
                }

                treeVis.update();
            });

            treeVis(this.$()[0]);
        }
    }
});
