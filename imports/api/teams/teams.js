import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';

export const Teams = new Mongo.Collection('teams');

TeamSchema = new SimpleSchema({
  teamName: {
    type: String,
  },
  members: {
    type: [Object],
  },
  createdBy: {
    type: String,
  },
  createdAt: {
    type: Date,
    autoValue: function() {
      return new Date();
    }
  }
});

Teams.attachSchema( TeamSchema );

if(Meteor.isServer) {


  // Meteor.publish('teams', function teamsPublication() {
  //   var user = Meteor.users.findOne(this.userId);
  //   console.log(Teams.find({members: user}).fetch());
  //   return Teams.find({members: user});
  // });

  Meteor.publishComposite('teams', {
    find: function() {
      // Find top ten highest scoring posts
      return Teams.find({memberIds: this.userId});
    },
    children: [
      {
        find: function(team) {
          // Find post author. Even though we only want to return
          // one record here, we use "find" instead of "findOne"
          // since this function should return a cursor.
          return Meteor.users.find(
            { _id: team.memberIds }
            // { limit: 1, fields: { profile: 1 } }
          );
        }
      }
    ]
  });

  // Meteor.publish('teams', function teamsPublication() {
  //   let currentUserId = this.userId;
  //   return Teams.find({memberIds: currentUserId});
  // });
  //

  // Meteor.publish("userDirectory", function () {
  //   //getting details of current user's team
  //   let currentUserId = this.userId;
  //   let currentTeam = Teams.findOne({ createdBy: currentUserId });
  //   // get a list of all current team members
  //   let ids = currentTeam.members;

  //   //return only users that belong to this team
  //   return Meteor.users.find({_id: {$in: ids}});
  //   //this will need to be changed to return only the pertinent fields for security purposes (eg username, email)
  // });

  Meteor.methods({
    'team.add'(teamName){
      check(teamName, String);

      let currentUser = Meteor.user();
      console.log(currentUser);
      let myTeam = Teams.insert({
        teamName,
        members: [],
        createdBy: currentUser._id,
      });
      console.log(myTeam);
      Teams.update({_id: myTeam}, { $push: { members: {username: "hello!"} }});
      console.log(Teams.findOne({teamName: teamName}));
    },
    'team.addMember'(newFriendEmail){
      check(newFriendEmail, String);
      let newFriendId = Accounts.createUser({email: newFriendEmail, username: newFriendEmail});
      let newFriend = Meteor.users.find(newFriendId);
      console.log(newFriend);
      // we can add the below function here to send an enrollment email:
      // Accounts.sendEnrollmentEmail(newFriendId)
      // more info here http://docs.meteor.com/api/passwords.html#Accounts-sendEnrollmentEmail

      let currentUserId = this.userId;
      let currentTeam = Teams.findOne({ createdBy: currentUserId });

      Teams.update(
        { _id: currentTeam._id },
        { $push: { members: newFriend } }
      );
    },
    'team.destroy'(teamId) {
      check(teamId, String);

      Teams.remove(teamId);
    },
  });
}
