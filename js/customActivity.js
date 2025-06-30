define(['postmonger'], function (Postmonger) {
    'use strict';

    var connection = new Postmonger.Session();
    var payload = {};

    $(window).ready(onRender);
    connection.on('initActivity', initialize);
    connection.on('clickedNext', save);
    // Listen for changes from the DE field selector
    connection.on('requestedTriggerEventDefinition', function (eventDefinitionModel) {
        if (eventDefinitionModel) {
            // eventDefinitionModel.dataExtensionId
            // eventDefinitionModel.key
        }
    });

    function onRender() {
        connection.trigger('ready');

        // The custom-body textarea is a manual input, but the phone number input
        // is populated by Journey Builder's UI, so we listen for that change.
        $('#custom-body').on('input', updateSaveButton);
    }

    function initialize(data) {
        if (data) payload = data;
        
        // Load the saved values for phoneNumber and customBody
        var phoneNumber = getArgumentValue('phoneNumber', '');
        var customBody = getArgumentValue('customBody', 'Hello from JB');

        $('#phone-number').val(phoneNumber);
        $('#custom-body').val(customBody);
        
        updateSaveButton();
    }

    function getArgumentValue(key, defaultValue) {
        if (payload.arguments && payload.arguments.execute && payload.arguments.execute.inArguments) {
            var inArguments = payload.arguments.execute.inArguments;
            for (var i = 0; i < inArguments.length; i++) {
                if (inArguments[i][key] !== undefined) {
                    // This logic is slightly improved to find the key in any object
                    return inArguments[i][key];
                }
            }
        }
        return defaultValue;
    }

    function updateSaveButton() {
        // Now validation depends on BOTH fields having a value
        var phoneNumber = $('#phone-number').val();
        var body = $('#custom-body').val();
        var enabled = Boolean(phoneNumber && body && body.trim());
        connection.trigger('updateButton', { button: 'next', enabled: enabled });
    }

    function save() {
        var phoneNumber = $('#phone-number').val();
        var customBody = $('#custom-body').val();

        // Find the inArgument objects and update them with the new values from our UI
        var inArguments = payload.arguments.execute.inArguments;
        inArguments.forEach(function(arg) {
            if (arg.phoneNumber !== undefined) {
                arg.phoneNumber = phoneNumber;
            }
            if (arg.customBody !== undefined) {
                arg.customBody = customBody;
            }
        });

        payload.name = `WhatsApp (Custom): ${customBody.substring(0, 20)}...`;
        payload.metaData.isConfigured = true;

        console.log('Saving Payload:', JSON.stringify(payload, null, 2));
        connection.trigger('updateActivity', payload);
    }
});