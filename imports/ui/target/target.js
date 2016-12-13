import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';
import { Targets } from '../../api/targets/targets.js';
import { SavingsAccounts } from '../../api/savingsAccounts/savingsAccounts.js';
import { Transactions } from '../../api/transactions/transactions.js';
import { MomentsJS } from 'meteor/momentjs:moment';
import { Accounting } from 'meteor/lepozepo:accounting';

import './target.html';
import './target.css';

Template.Target.onCreated(function targetOnCreated() {
  this.calculation = new ReactiveDict();
  Meteor.subscribe('targets');
  Meteor.subscribe('savingsAccounts');
  Meteor.subscribe('transactions');
});

Template.Target.helpers({
  targets() {
    return Targets.find({});
  },
  targetDate() {
    const userId = Meteor.userId();
    const target = Targets.findOne({createdBy: userId});
    const targetDate = target.targetDate.toDateString();
    return targetDate;
  },
  targetAmount() {
    const userId = Meteor.userId();
    const target = Targets.findOne({createdBy: userId});
    return accounting.formatMoney(target.targetAmount, "£ ", 0);
  },
  targetSummary() {
    const instance = Template.instance();
    return instance.calculation.get('targetSummary');
  },
  dailyTarget() {
    const instance = Template.instance();
    return instance.calculation.get('dailyTarget');
  },
  weeklyTarget() {
    const instance = Template.instance();
    return instance.calculation.get('weeklyTarget');
  },
  monthlyTarget() {
    const instance = Template.instance();
    return instance.calculation.get('monthlyTarget');
  },
  currentBalance() {
    const userId = Meteor.userId();
    const account = SavingsAccounts.findOne({createdBy: userId});
    if(account) {
      return accounting.formatMoney(account.balance, "£ ", 0);
    }
  },
  stillToSave() {
    const userId = Meteor.userId();
    var currentBalance = SavingsAccounts.findOne({createdBy: userId}).balance;
    var currentTarget = Targets.findOne({createdBy: userId}).targetAmount;
    var stillToSave = currentTarget - currentBalance;
    // string formatting function here:
    // return value = formatAsCurrency(stillToSave)
    return "£" + stillToSave;
  },
  percentageOfTotal() {
    const userId = Meteor.userId();
    var currentBalance = SavingsAccounts.findOne({createdBy: userId}).balance;
    var currentTarget = Targets.findOne({createdBy: userId}).targetAmount;
    var percentage = Math.round((currentBalance/currentTarget) * 100);
    return percentage;
  },
  totalInDegrees() {
    var total = Template.Target.__helpers.get('percentageOfTotal').call();
    var totalInDegrees = ((total * 2.4) - 120).toString() + 'deg';
    return totalInDegrees;
  },
  degreesAbove() {
    var total = Template.Target.__helpers.get('percentageOfTotal').call();
    var degreesAbove = ((total * 2.4) - 120 + 6).toString() + 'deg';
    return degreesAbove;
  },
  degreesBelow() {
    var total = Template.Target.__helpers.get('percentageOfTotal').call();
    var degreesBelow = ((total * 2.4) - 120 - 6).toString() + 'deg';
    return degreesBelow;
  },
  setPreviousDate(date,number,period) {
    var startingDate = moment(date);
    var previousDate = startingDate.subtract(number,period);
    return previousDate.toDate();
  },

  transactionsInRange(dateOption) {
    const userId = Meteor.userId();
    var currentDate = new Date();
    var previousDate = Template.Target.__helpers.get('setPreviousDate').call(this,currentDate,1,dateOption);
    var transactionsInRange = Transactions.find( {$and: [ {owner: userId}, {createdAt: {$lt: currentDate, $gte: previousDate} } ] } ).fetch();
    return transactionsInRange;
  },

  transactionsValue(dateOption){
    var transactions = Template.Target.__helpers.get('transactionsInRange').call(this, dateOption);
    var total = 0;
    for (var i = 0; i < transactions.length; i++) {
      total += transactions[i].amount;
    }
    return total;
  },
});

Template.Target.events({
  'click .calculate'(event, template) {
    event.preventDefault();
    const targetAmount = template.find('.targetAmount').value;
    var formattedTargetAmount = '£' + targetAmount.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
    const userId = Meteor.userId();
    var currentBalance = SavingsAccounts.findOne({createdBy: userId}).balance;

    var stillToSave = targetAmount - currentBalance;
    var formattedStillToSave = "£" + parseInt(targetAmount - currentBalance);

    var targetDate = new Date(template.find('.targetDate').value);
    var formattedTargetDate = targetDate.toDateString();
    var today = new Date();
    var daysToSave = Date.daysBetween(today, targetDate);

    var amountPerMonth = Math.round(((stillToSave / daysToSave) * 365) / 12);
    var amountPerWeek = Math.round((stillToSave / daysToSave) * 7);
    var amountPerDay = Math.round(stillToSave / daysToSave);

    var targetSummary = "You need an extra "+ formattedStillToSave + ", to save " + formattedTargetAmount + " by " + formattedTargetDate + ", you'll need to save:";
    var monthlyTarget = "£" + amountPerMonth + " each month.";
    var weeklyTarget = "£" + amountPerWeek + " each week.";
    var dailyTarget = "£" + amountPerDay + " each day.";

    template.calculation.set('stillToSave', stillToSave);
    template.calculation.set('targetSummary', targetSummary);
    template.calculation.set('monthlyTarget', monthlyTarget);
    template.calculation.set('weeklyTarget', weeklyTarget);
    template.calculation.set('dailyTarget', dailyTarget);
  },
  'change .date-range'(event) {
    event.preventDefault();
    const dateRange = event.target;
    var dateOption = dateRange.value;
    var transactionsTotal = Template.Target.__helpers.get('transactionsValue').call(this, dateOption);
    console.log(transactionsTotal);
    var targetDate = moment(Template.Target.__helpers.get('targetDate').call());
    console.log(targetDate.toDate());
  },
  'submit .new-target'(event) {
    event.preventDefault();
    const target = event.target;
    var targetAmount = parseInt(target.targetAmount.value);
    var targetDate = new Date(target.targetDate.value);
    Meteor.call('targets.add', targetAmount, targetDate);

    // Clear form
    target.targetAmount.value = '';
    target.targetDate.value = '';
  },
  'click .delete-target'(event) {
    const target = event.target;
    var targetId = target.name;
    Meteor.call('targets.remove', targetId);
  }
});

Template.EditTarget.events({
  'submit .edit-target'(event) {
    event.preventDefault();
    const target = event.target;
    const targetAmount = parseInt(target.targetAmount.value);
    const targetDate = new Date(target.targetDate.value);
    Meteor.call('targets.edit', targetAmount, targetDate);
    // route back to /target
    FlowRouter.go('target');
  }
});

Template.EditTarget.helpers({
  targetAmount() {
    return Targets.find({}).fetch()[0].targetAmount;
  },
  targetDate() {
    return Targets.find({}).fetch()[0].targetDate;
  }
});

Date.daysBetween = function( date1, date2 ) {
  //Get 1 day in milliseconds
  var one_day=1000*60*60*24;
  // Convert both dates to milliseconds
  var date1_ms = date1.getTime();
  var date2_ms = date2.getTime();
  // Calculate the difference in milliseconds
  var difference_ms = date2_ms - date1_ms;
  // Convert back to days and return
  return Math.round(difference_ms/one_day);
};
