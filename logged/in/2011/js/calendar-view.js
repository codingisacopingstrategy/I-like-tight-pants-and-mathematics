Date.prototype.toISOish = function() {
    // like http://stackoverflow.com/questions/2573521/how-do-i-output-an-iso-8601-formatted-string-in-javascript
    // but we explicitly don’t want to use UTC time
    // ( maybe we should, at some time? )
    function pad(n) { return n < 10 ? '0' + n : n; }
    return this.getFullYear() + '-'
        + pad(this.getMonth() + 1) + '-'
        + pad(this.getDate()) + 'T'
        + pad(this.getHours()) + ':'
        + pad(this.getMinutes()) + ':'
        + pad(this.getSeconds());
};

/**
 * When the Date is ok, but the time has to be around 22:00
 * Sets the time component of the date to around 22:00 with 10 minutes deviation in either way 
 * cf http://stackoverflow.com/a/1214753/319860 */
Date.prototype.roundAboutTen = function() {
    this.setHours(22);
    this.setMinutes(0);
    this.setSeconds(Math.floor(Math.random() * 60));
    this.setTime(this.getTime() + ( Math.floor(Math.random() * 20) - 10 ) * 60000 );
};

$("#time").fullCalendar({
    editable: true,
    events: events,
    eventRender: function(event, element) {
        element.append('<img src="' + event.screenshot_url + '" />' );
    },
    eventDrop: function(event) {
            event.start.roundAboutTen();
            postData = { id : event.id,
                         created_on : event.start.toISOish() };
            console.log(postData);
            var request = jQuery.ajax({
                url: event.resource_uri,
                type: "PATCH",
                data: JSON.stringify(postData),
                dataType: "json",
                contentType: "application/json",
                processData: false,
                success: function(data) {
                    console.log("Succesfully updated " + event.title);
                },
                error: function(xhr, status, error) {
                    console.log("error!");
                    console.log(xhr, status, error);
                },
            });
        }
});
