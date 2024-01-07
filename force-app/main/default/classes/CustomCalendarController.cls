public with sharing class CustomCalendarController {
	@AuraEnabled(cacheable=true)
    public static List<Meetings__c> getAllMeetingsData() {
        List<Meetings__c> meetingsList = [SELECT ID, End_Date_Time__c, Start_Date_Time__c, Purpose__c 
                                         	FROM Meetings__c];
        for(Meetings__c meet: meetingsList) {
            meet.End_Date_Time__c = meet.End_Date_Time__c.dateGMT();
            meet.Start_Date_Time__c = meet.Start_Date_Time__c.dateGMT();
        }
        return meetingsList;
    }
}