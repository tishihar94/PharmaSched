var data1;

// execute when the DOM is fully loaded
$(function() {
    chrome.storage.sync.get("userinfo", function(obj) {
        if (Object.keys(obj).length === 0) {
            console.log("Yup");
            $.getJSON("static/userinfo.json", function(data) {
                chrome.storage.sync.set({userinfo: data});
            });

            chrome.storage.sync.get("userinfo", function(obj) {
                console.log(obj);
            });
        }
    });
    var date = new Date();
    setBackground(date);
    setDate(date);
    getUserInfo();
    setInterval('updateClock()', 1000);
    initiateForms();

    //FOR SYNCING NEW JSON WITH CHROME.STORAGE
//    $.getJSON("static/userinfo.json", function(data) {
//        chrome.storage.sync.set({userinfo: data});
//    });
//
//    chrome.storage.sync.get("userinfo", function(obj) {
//        console.log(obj);
//    });
});

function initiateForms() {
    dropdownmenu(); //enables accordion animation of dropdownmenu

    formValidate(); //adds validators to forms

    drugPeriod(); //sets up calendar input forms for start/end dates on add-drug form

    fillSelect(); //fills select forms on add-drug form with options 1-12

    asNeededformdisable();

    editDrugInfo()

    deleteDrugFromSched()
}
function dropdownmenu() {
    // Add slideDown animation to Bootstrap dropdown when expanding.
    $('.dropdown').on('show.bs.dropdown', function() {
        $(this).find('.dropdown-menu').first().stop(true, true).slideDown();
      });

      // Add slideUp animation to Bootstrap dropdown when collapsing.
      $('.dropdown').on('hide.bs.dropdown', function() {
            $(this).find('.dropdown-menu').first().stop(true, true).slideUp();
      });
}

//fills .1-12 select input form with options 1-12
function fillSelect() {
    var $nums = $(".1-12");
    for (i = 1; i <= 12; i++){
        $nums.append($('<option></option>').val(i).html(i));
    }
}

function getUserInfo() {
    chrome.storage.sync.get('userinfo', function(obj) {
        var data = obj.userinfo;
        console.log(data);
        var name = data.name;
        setName(name);
        fillDoseSchedule(data);
        fillSleepSchedule(data);
        addDrugForm(data);
        updateUserPrefs(data);
    });
}

function setName(name) {
    $('#name').val(name);
    if (name == ''){
        $('#hello-user').html("new user.");
    }
    else{
        name += "."
        $('#hello-user').html(name);
    }
}

function fillDoseSchedule(data) {
    $('#schedBody tr').remove();
    var tr;
    var td;
    var n = data.drugs.length;
    var today = new Date(Date.now());
    today.setHours(0,0,0,0);
    var timeNow = today.getTime();

    for (i = 0; i < n; i++) {
        if (data.drugs[i].frequency == 1) {
            var frequency = "";
        } else {
            var frequency = data.drugs[i].frequency;
        }
        var nextDayStr = nextDay(data, i, timeNow)

        //tr = $('<tr id="' + i + 'row" />');
        tr = $(rowColor(data, i, nextDayStr, today));
        tr.append('<td><button type="button" class="edit btn btn-sm" style="background-color:transparent" id="' + i + 'edit"><span class="glyphicon glyphicon-edit"></span></button></td>');
        tr.append('<td>' + data.drugs[i].drugName + "</td>");

        if (data.drugs[i].asNeeded == "True") {
            tr.append('<td style="font-size:12px;">' + data.drugs[i].numDoses + " " + data.drugs[i].intakeMethod + ", " + 'take as needed' + '</td>');
        } else {
            tr.append('<td style="font-size:12px;">' + data.drugs[i].numDoses + " " + data.drugs[i].intakeMethod + ", " + data.drugs[i].timesPerDay + " times, every " + frequency + " " + data.drugs[i].timePeriod + "</td>");
        }
        tr.append('<td></td>'); //Today's Sched
        tr.append('<td>' + nextDayStr + '</td>'); //Next Day
        tr.append('<td><td><button type="button" class="delete btn btn-sm" style="background-color:transparent" id="' + i + 'delete"><span class="glyphicon glyphicon-trash"></span></button></td>');
        $('#schedBody').append(tr);


    }
}

//calculates the nextDay the medication needs to be taken
function nextDay(data, index, timeNow) {
    var endDateObj = new Date(data.drugs[index].endDate);
    var startDateObj = new Date(data.drugs[index].startDate);

    var nextDayToTake = new Date(startDateObj);

    //if today is after endDate
    if (timeNow > endDateObj.getTime()) {
        return "expired";
    }
    else {
        if(data.drugs[index].asNeeded == "True") {
            return "As Needed";
        }

        else {
            if (data.drugs[index].timePeriod == "day(s)") {
                var timePeriodDays = data.drugs[index].frequency;

                nextDayToTake = dayAdder(timeNow, startDateObj, timePeriodDays);

                return nextDayToTake.toLocaleDateString();

            } else if (data.drugs[index].timePeriod == "week(s)") {
                var timePeriodDays = data.drugs[index].frequency * 7;

                nextDayToTake = dayAdder(timeNow, startDateObj, timePeriodDays);

                return nextDayToTake.toLocaleDateString();

            } else if (data.drugs[index].timePeriod == "month(s)") {
                while(timeNow > nextDayToTake.getTime()){
                        var sumMonths = parseInt(nextDayToTake.getMonth()) + parseInt(data.drugs[index].frequency);
                        nextDayToTake.setMonth(sumMonths);
                }
                if(nextDayToTake.getTime() > endDateObj.getTime()){
                    return "expired";
                }
                else {
                    return nextDayToTake.toLocaleDateString();
                }
            }
            else {
                while(timeNow > nextDayToTake.getTime()){
                    var sumYears = parseInt(nextDayToTake.getFullYear()) + parseInt(data.drugs[index].frequency);
                    nextDayToTake.setYear(sumYears);
                }
                if(nextDayToTake.getTime() > endDateObj.getTime()){
                        return "expired";
                    }
                else {
                    return nextDayToTake.toLocaleDateString();
                }
            }
        }
    }
}

//Adds days to the currentDate
function dayAdder(timeNow, startDateObj, timePeriodDays) {
    var diffDays = Math.round((timeNow - startDateObj.getTime())/(1000 * 60 * 60 * 24));

    var daysToAdd = timePeriodDays - (diffDays % timePeriodDays);

    if (daysToAdd == 0){
        daysToAdd = timePeriodDays;
    }

    else if(diffDays < 0) {
        return startDateObj;
    }

    else {
        var nextDay = new Date(timeNow);
        nextDay.setDate(parseInt(nextDay.getDate() + parseInt(daysToAdd)));
        return nextDay;
    }
}

function rowColor(data, index, nextDayStr, today) {

    if(nextDayStr === "expired") {
        return '<tr class="danger" />';
    }
    else if(nextDayStr === "As Needed") {
        return '<tr class="warning" />';
    }
    else {
        var nextDay = new Date(nextDayStr);
        nextDay.setHours(0,0,0,0);
        var period = data.drugs[index].frequency;
//        console.log("today: " + today);
//        console.log("nextDay: " + nextDay);
        if (data.drugs[index].timePeriod == "day(s)") {
            nextDay.setDate(parseInt(nextDay.getDate()) - parseInt(period));
        }
        else if (data.drugs[index].timePeriod == "week(s)") {
            period = data.drugs[index].frequency * 7;
            nextDay.setDate(parseInt(nextDay.getDate()) - parseInt(period));
        }
        else if (data.drugs[index].timePeriod == "month(s)") {
            nextDay.setMonth(parseInt(nextDay.getMonth()) - parseInt(period));
        }
        else {
            nextDay.setFullYear(parseInt(nextDay.getFullYear()) - parseInt(period));
        }

        if (nextDay.getTime() === today.getTime()) {
            console.log("yes");
            return '<tr class="success" />';
        }
        else {
            console.log("NO");
            return '<tr />';
        }
    }
}



//    var diffDays = Math.floor((Date.UTC(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate()) - Date.UTC(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate()) ) /(1000 * 60 * 60 * 24));
//
//    console.log(diffDays);
//
//    if (diffDays == 0) {
//        return '<tr class="info"/>';
//    }
//    else {
//        return '<tr class="active"/>';
//    }
//}

//auto fills sleep schedule forms with data from user info
function fillSleepSchedule(data) {
    for (i = 0; i < 7; i++){
        if (data.schedule[i].wakeup != ''){
            var wakeId = "#wake" + i;
            $(wakeId).val(data.schedule[i].wakeup);
        }
        if (data.schedule[i].bedtime != ''){
            var bedId = "#bed" + i;
            $(bedId).val(data.schedule[i].bedtime);
        }
    }
}

function formValidate() {
    // The pattern of times that accepts moments between 09:00 to 17:59
    var TIME_PATTERN = /^([0-1]{1}[0-9]{1}|2[0-4]{1}):[0-5]{1}[0-9]{1}$/;

    var DAY_PATTERN = /^(0[1-9]{1}|1[0-2]{1}|[1-9]{1})\/(0[1-9]{1}|[1-2]{1}[0-9]{1}|3[0-1]{1}|[1-9]{1})\/([1-2]{1}[0-9]{1}[0-9]{1}[0-9]{1})$/;

    $('#registration').bootstrapValidator({
        feedbackIcons: {
            valid: 'glyphicon glyphicon-ok',
            invalid: 'glyphicon glyphicon-remove',
            validating: 'glyphicon glyphicon-refresh'
        },
        fields: {
            nameField: {
                validators: {
                    notEmpty: {
                        message: 'This field cannot be empty'
                    }
                }
            },
            startTime: {
                validators: {
                    notEmpty: {
                        message: 'Cannot be empty'
                    },
                    regexp: {
                        regexp: TIME_PATTERN,
                        message: 'Time must be between 00:00 and 24:00'
                    }
                }
            },
            endTime: {
                validators: {
                    notEmpty: {
                        message: 'Cannot be empty'
                    },
                    regexp: {
                        regexp: TIME_PATTERN,
                        message: 'Bedtime must be between 00:00 and 24:00'
                    }
                }
            }
        }
    })

    $('#addDrugForm').bootstrapValidator({
        framework: 'bootstrap',

        feedbackIcons: {
            valid: 'glyphicon glyphicon-ok',
            invalid: 'glyphicon glyphicon-remove',
            validating: 'glyphicon glyphicon-refresh'
        },
        submitButtons: 'button[type="submit"]',
        fields: {
            drugNameForm: {
                validators: {
                    notEmpty: {
                        message: 'Cannot be empty'
                    }
                }
            },
            startDateForm: {
                validators: {
                    regexp: {
                        regexp: DAY_PATTERN,
                        message: 'MM/DD/YYYY'
                    }
                }
            }
        }
    })
    .on('success.field.fv', function (e, data) {
        if (data.fv.getInvalidFields().length > 0) { // There is invalid field
            data.fv.disableSubmitButtons(true);
        }
    });
}

function setDate(date) {
    var m_names = new Array("January", "February", "March", "April", "May", "June", "July", "August", "September",
        "October", "November", "December");
    var d_names = new Array("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday");
    var currDate = date.getDate();
    var currMonth = date.getMonth();
    var currYear = date.getFullYear();
    var dayofweek = date.getDay();
    var strDate = d_names[dayofweek] + ", " + m_names[currMonth] + " " + currDate + ", " + currYear;
    $("#date").html(strDate);
}

//12-hr clock that updates every 1000ms and shows am/pm
//https://stackoverflow.com/a/8888498/8355724
function updateClock() {
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();
    var ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;
    seconds = seconds < 10 ? '0'+seconds : seconds;
    var strTime = hours + ':' + minutes + ':' + seconds + ' ' + ampm;
    $("#time").html(strTime);
}

//dynamically changes background image depending on time
function setBackground(date){
    var currentTime = date.getHours();
    if (4 <= currentTime && currentTime < 6){
        $('#greeting').html("Good morning,");
        $('body').css('background','url(images/dawn.jpg)');
    }
    else if (6 <= currentTime && currentTime < 10) {
        $('#greeting').html("Good morning,");
        $('body').css('background','url(images/morning.jpg)');
    }
    else if (10 <= currentTime && currentTime < 14){
        $('#greeting').html("Good afternoon,");
        $('body').css('background-image','url(images/day.jpg)');
    }
    else if (17 <= currentTime && currentTime < 19){
        $('#greeting').html("Good evening,");
        $('body').css('background-image','url(images/sunset.jpg)');
    }
    else{
        $('#greeting').html("Good evening,");
        $('body').css('background-image','url(images/night.jpg)');
    }
}

//disables a few forms if #asNeeded is checked
function asNeededformdisable() {
    $("#asNeeded").change(function() {
    if ($('#asNeeded').is(':checked') == true){
        $('#timesPerDay').prop('disabled', true);
        $('#timesPerDay').css({'background-color':'grey'});
        $('#timePeriod').prop('disabled', true);
        $('#timePeriod').css({'background-color':'grey'});
        $('#frequency').prop('disabled', true);
        $('#frequency').css({'background-color':'grey'});
    }
    else{
        $('#timesPerDay').removeAttr('disabled');
        $('#timesPerDay').css({'background-color':'white'});
        $('#timePeriod').removeAttr('disabled');
        $('#timePeriod').css({'background-color':'white'});
        $('#frequency').removeAttr('disabled');
        $('#frequency').css({'background-color':'white'});
    }
    });
}

//makes calendar form input for start/end dates of drug period
/** http://www.eyecon.ro/bootstrap-datepicker/ */
function drugPeriod() {
    var nowTemp = new Date();
    var now = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate(), 0, 0, 0, 0);

    var checkin = $('#startDate').datepicker({
      onRender: function(date) {
        return date.valueOf() < now.valueOf() ? 'disabled' : '';
      }
    }).on('changeDate', function(ev) {
      if (ev.date.valueOf() > checkout.date.valueOf()) {
        var newDate = new Date(ev.date)
        newDate.setDate(newDate.getDate() + 1);
        checkout.setValue(newDate);
      }
      checkin.hide();
      $('#endDate')[0].focus();
    }).data('datepicker');
    var checkout = $('#endDate').datepicker({
        onRender: function(date) {
            return date.valueOf() <= checkin.date.valueOf() ? 'disabled' : '';
      }
    }).on('changeDate', function(ev) {
      checkout.hide();
    }).data('datepicker');

}

function addDrugForm(data) {

    var drugInfo = {};

    $('#addDrugtoSched').click(function(submit) {
        if ($('#addDrugtoSched').hasClass("disabled") == false){
            submit.preventDefault();
            drugInfo.drugName = $('#drugName').val();
            drugInfo.numDoses = $('#numDoses').val();
            drugInfo.intakeMethod = $('#intakeMethod').val();
            drugInfo.timesPerDay = $('#timesPerDay').val();
            drugInfo.frequency = $('#frequency').val();
            drugInfo.timePeriod = $('#timePeriod').val();
            if($('#startDate').val() == "") {
                var today = new Date();
                var todayJSON = today.toJSON();

                drugInfo.startDate = todayJSON;
            }
            else {
                var startDateObject = new Date($('#startDate').val());
                var startDateJSON = startDateObject.toJSON();

                drugInfo.startDate = startDateJSON;
            }

            if($('#endDate').val() != "") {
                var endDateObject = new Date($('#endDate').val());
                var endDateJSON = endDateObject.toJSON();

                drugInfo.endDate = endDateJSON;
            }
            else {
                drugInfo.endDate = "";
            }

            if ($('#asNeeded').is(':checked') == true) {
                drugInfo.asNeeded = "True";
            }
            else {
                drugInfo.asNeeded = "False";
            }
            data.drugs.push(drugInfo);
            chrome.storage.sync.set({userinfo: data}, function(obj) {
                console.log('obj');
            });

            getUserInfo();
        }
    });
}

function editDrugInfo() {
    $(document).on('click', '.edit', function(){
        $('#addDrugtoSched').addClass('hidden');
        $('#submitEdit').removeClass('hidden');
        $('#addDrugFormWindow').collapse("show");
        $('#newDrugbtn').collapse("hide");

        var editIndex = parseInt(this.id);
        var data;
        chrome.storage.sync.get('userinfo', function(obj) {
            data = obj.userinfo;
            $('#drugName').val(data.drugs[editIndex].drugName);
            $('#numDoses').val(data.drugs[editIndex].numDoses);
            $('#intakeMethod').val(data.drugs[editIndex].intakeMethod);
            $('#timesPerDay').val(data.drugs[editIndex].timesPerDay);
            $('#frequency').val(data.drugs[editIndex].frequency);
            $('#timePeriod').val(data.drugs[editIndex].timePeriod);

            var start = new Date(data.drugs[editIndex].startDate);
            start = start.toLocaleDateString();
             $('#startDate').val(start);

            if(data.drugs[editIndex].endDate != "") {
                var endDateStr = data.drugs[editIndex].endDate;
                var endDateObj = new Date(endDateStr);

                endDateStr = endDateObj.toLocaleDateString();
                $('#endDate').val(endDateStr);
            }
            if(data.drugs[editIndex].asNeeded == "True") {
                $('#asNeeded').prop('checked', true);
                $('#timesPerDay').prop('disabled', true);
                $('#timesPerDay').css({'background-color':'grey'});
                $('#timePeriod').prop('disabled', true);
                $('#timePeriod').css({'background-color':'grey'});
                $('#frequency').prop('disabled', true);
                $('#frequency').css({'background-color':'grey'});
            }
        });
        $('#closeDrugFormbtn').click(function() {
            $('#submitEdit').addClass('hidden');
            $('#addDrugtoSched').removeClass('hidden');

            $('#drugName').val("Drug Name");
            $('#startDate').val("");
            $('#endDate').val("");
            $('#numDoses').val("1");
            $('#intakeMethod').val("pill(s)");
            $('#frequency').val("1");
            $('#timesPerDay').val("1");
            $('#timePeriod').val("day(s)");
            $('#asNeeded').prop('checked', false);
             $('#timesPerDay').removeAttr('disabled');
            $('#timesPerDay').css({'background-color':'white'});
            $('#timePeriod').removeAttr('disabled');
            $('#timePeriod').css({'background-color':'white'});
            $('#frequency').removeAttr('disabled');
            $('#frequency').css({'background-color':'white'});
        });

        $('#submitEdit').click(function() {
            data.drugs[editIndex].drugName = $('#drugName').val();
            data.drugs[editIndex].numDoses = $('#numDoses').val();
            data.drugs[editIndex].intakeMethod = $('#intakeMethod').val();
            data.drugs[editIndex].timesPerDay = $('#timesPerDay').val();
            data.drugs[editIndex].frequency = $('#frequency').val();
            data.drugs[editIndex].timePeriod = $('#timePeriod').val();
            data.drugs[editIndex].startDate = $('#startDate').val();
            if($('#startDate').val() == "") {
                var today = new Date();
                var todayJSON = today.toJSON();
                data.drugs[editIndex].startDate = todayJSON;
            }
            else {
                var startDateObj = new Date($('#startDate').val());
                startDateJSON = startDateObj.toJSON();
                data.drugs[editIndex].startDate = startDateJSON;
            }

            if($('#endDate').val() == "") {
                data.drugs[editIndex].endDate = "";
            }
            else {
                var endDateObj = new Date($('#endDate').val());

                var endDateJSON = endDateObj.toJSON();

                data.drugs[editIndex].endDate = endDateJSON;
            }

            if ($('#asNeeded').is(':checked') == true) {
                data.drugs[editIndex].asNeeded = "True";
            }
            else {
                data.drugs[editIndex].asNeeded = "False";
            }
            chrome.storage.sync.set({userinfo: data}, function(obj) {
               console.log(obj);
            });

            fillDoseSchedule(data);
        })
    });
}

function deleteDrugFromSched() {
    $(document).on('click', '.delete', function(event){
        var confirmation = confirm("Are you sure you want to delete this medication?");
        if(confirmation) {
            var deleteIndex = parseInt(this.id);
            chrome.storage.sync.get('userinfo', function(obj) {
                var data = obj.userinfo;
                data.drugs.splice(deleteIndex, 1);
                chrome.storage.sync.set({userinfo: data}, function(obj) {
                });

                fillDoseSchedule(data);
            });
        }
        else {
            event.preventDefault();
        }
    });
}


function updateUserPrefs(data) {
    $('#updateUser1').click(function(submit) {
        if (($('#updateUser1').hasClass("disabled") == false)) {

            //get and update user's name
            data.name = $('#name').val();

            //get and update sleep schedule
            for(i = 0; i < 7; i++){
                var wakeId = "#wake" + i;
                var bedId = "#bed" + i;

                data.schedule[i].wakeup = $(wakeId).val();

                data.schedule[i].bedtime = $(bedId).val();
            }
            chrome.storage.sync.set({userinfo: data}, function(obj) {
               console.log(obj);
            });
        }
        getUserInfo();
    });
    $('#updateUser2').click(function(submit) {
        if (($('#updateUser2').hasClass("disabled") == false)) {

            //get and update user's name
            data.name = $('#name').val();

            //get and update sleep schedule
            for(i = 0; i < 7; i++){
                var wakeId = "#wake" + i;
                var bedId = "#bed" + i;

                data.schedule[i].wakeup = $(wakeId).val();

                data.schedule[i].bedtime = $(bedId).val();
            }
            chrome.storage.sync.set({userinfo: data}, function(obj) {
               console.log(obj);
            });
        }
        getUserInfo();
    });
}
