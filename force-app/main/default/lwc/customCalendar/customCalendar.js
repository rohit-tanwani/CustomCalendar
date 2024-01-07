import { LightningElement, wire } from 'lwc';

import FullCalendarJS from '@salesforce/resourceUrl/FullCalendar';
import FullCalendarCustom from '@salesforce/resourceUrl/FullCalendarCustom';
import { loadStyle, loadScript } from 'lightning/platformResourceLoader';
import { NavigationMixin } from "lightning/navigation";
import { refreshApex } from '@salesforce/apex';
import { encodeDefaultFieldValues } from "lightning/pageReferenceUtils";
import LightningConfirm from 'lightning/confirm';
import { deleteRecord } from "lightning/uiRecordApi";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getAllMeetingsData from '@salesforce/apex/CustomCalendarController.getAllMeetingsData';

export default class CustomCalendar extends NavigationMixin(LightningElement) {

    calendar;
    calendarTitle;
    objectApiName = 'Meetings__c';
    objectLabel = '';
    eventsList = [];
    viewOptions = [
        {
            label: 'Day',
            viewName: 'timeGridDay',
            checked: false
        },
        {
            label: 'Week',
            viewName: 'timeGridWeek',
            checked: false
        },
        {
            label: 'Month',
            viewName: 'dayGridMonth',
            checked: true
        },
        {
            label: 'Table',
            viewName: 'listView',
            checked: false
        }
    ];

    @wire(getAllMeetingsData)
    wiredMeetings(result) {
        if(result.data) {
            const eventList = [];
            for(let meeting of result.data) {
                const event = {
                    id: meeting.Id,
                    editable: true, 
                    allDay : false,
                    start: meeting.Start_Date_Time__c,
                    end: meeting.End_Date_Time__c,
                    title: meeting.Purpose__c
                }
                eventList.push(event);
            }
            this.eventsList = eventList;
            this.dataToRefresh = result;
        } else if(result.error){
            console.log(error);
        }
    }

    get buttonLabel() {
        return 'New ' + this.objectLabel;
    }

    changeViewHandler(event) {
        const viewName = event.detail.value;
        if(viewName != 'listView') {
            this.calendar.changeView(viewName);
            const viewOptions = [...this.viewOptions];
            for(let viewOption of viewOptions) {
                viewOption.checked = false;
                if(viewOption.viewName === viewName) {
                    viewOption.checked = true;
                }
            }
            this.viewOptions = viewOptions;
            this.calendarTitle = this.calendar.view.title;
        } else {
            this.handleListViewNavigation(this.objectApiName);
        }
    }

    handleListViewNavigation(objectName) {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: objectName,
                actionName: 'list'
            },
            state: {
                filterName: 'Recent' 
            }
        });
    }

    calendarActionsHandler(event) {
        const actionName = event.target.value;
        if(actionName === 'previous') {
            this.calendar.prev();
        } else if(actionName === 'next') {
            this.calendar.next();
        } else if(actionName === 'today') {
            this.calendar.today();
        } else if(actionName === 'new') {
            this.navigateToNewRecordPage(this.objectApiName);
        } else if(actionName === 'refresh') {
            this.refreshHandler();
        }
        this.calendarTitle = this.calendar.view.title;
    }

    navigateToNewRecordPage(objectName, defaultValues) {
        if(!defaultValues) {
            defaultValues = {};
        }
        this[NavigationMixin.Navigate]({
          type: "standard__objectPage",
          attributes: {
            objectApiName: objectName,
            actionName: "new",
          },
          state: {
            defaultFieldValues: defaultValues
          }
        });
    }

    connectedCallback() {
        Promise.all([
            loadStyle(this, FullCalendarJS + '/lib/main.css'),
            loadScript(this, FullCalendarJS + '/lib/main.js'),
            loadStyle(this, FullCalendarCustom)
        ])
        .then(() => {
            this.initializeCalendar();
        })
        .catch(error => console.log(error))
    }

    refreshHandler() {
        refreshApex(this.dataToRefresh)
        .then(() => {
            this.initializeCalendar();
        });
    }

    initializeCalendar() {
        const calendarEl = this.template.querySelector('div.fullcalendar');
        const copyOfOuterThis = this;
        const calendar = new FullCalendar.Calendar(calendarEl, {
            headerToolbar: false,
            initialDate: new Date(),
            timeZone: 'UTC', 
            showNonCurrentDates: false,
            fixedWeekCount: false,
            allDaySlot: false,
            navLinks: false,
            events: copyOfOuterThis.eventsList,
            eventDisplay: 'block',
            eventColor: '#f36e83',
            eventTimeFormat: {
                hour: 'numeric',
                minute: '2-digit',
                omitZeroMinute: true,
                meridiem: 'short'
            },
            dayMaxEventRows: true,
            eventTextColor: 'rgb(3, 45, 96)',
            dateClick: function(info) {
                const defaultValues = encodeDefaultFieldValues({
                    Start_Date_Time__c: info.dateStr
                });
                copyOfOuterThis.navigateToNewRecordPage(copyOfOuterThis.objectApiName, defaultValues);
            },
            eventClick: function(info) {
                copyOfOuterThis.showConfirmWindow(info.event);
            }
        });
        calendar.render();
        calendar.setOption('contentHeight', 550);
        this.calendarTitle = calendar.view.title;
        this.calendar = calendar;
    }

    async showConfirmWindow(event) {
        const result = await LightningConfirm.open({
            message: 'Are you sure you want to delete this Meeting?',
            variant: 'header',
            label: 'Delete Meeting',
            theme: 'brand'
        });

        if(result) {
            const eventToDelete = this.calendar.getEventById(event.id);
            eventToDelete.remove();

            deleteRecord(event.id)
            .then(() => {
                const event = new ShowToastEvent({
                    title: 'Deleted!',
                    message: 'Record deleted successfully',
                    variant: 'success'
                });
                this.dispatchEvent(event);
                
            })
            .catch(error => {
                const event = new ShowToastEvent({
                    title: 'Error occured!',
                    message: error.message,
                    variant: 'error'
                });
                this.dispatchEvent(event);
            })
        } 
    }
}