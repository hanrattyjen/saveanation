import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Accounts } from 'meteor/accounts-base';

export const Blocks = new Mongo.Collection('blocks');

if(Meteor.isServer) {
  Meteor.publish('blocks', function blocksPublication() {
    return Blocks.find();
  });
}

Meteor.methods({
  'blocks.add'(blockType, src, xPos, yPos){
    if(! this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    var block = Blocks.insert({
      blockType,
      xPos,
      yPos,
      src,
      createdBy: this.userId,
      createdAt: new Date(),
    });
    return block;
  },
  'blocks.edit'(blockId, blockType, xPos, yPos) {
    if(! this.userId) {
      throw new Meteor.Error('not-authorized');
    }
    Blocks.update(
      { _id: blockId },
      { $set:
        {
          blockType:blockType,
          xPos:xPos,
          yPos:yPos
        }
      }
    );
  },
  'blocks.delete'(blockId) {
    Blocks.remove(blockId);
  }
});
