import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('phylogenetic-tree', 'Integration | Component | phylogenetic tree', {
  integration: true
});

test('it renders', function(assert) {
  assert.expect(2);

  // Set any properties with this.set('myProperty', 'value');
  // Handle any actions with this.on('myAction', function(val) { ... });

  this.render(hbs`{{phylogenetic-tree}}`);

  assert.equal(this.$().text().trim(), '');

  // Template block usage:
  this.render(hbs`
    {{#phylogenetic-tree}}
      template block text
    {{/phylogenetic-tree}}
  `);

  assert.equal(this.$().text().trim(), 'template block text');
});
