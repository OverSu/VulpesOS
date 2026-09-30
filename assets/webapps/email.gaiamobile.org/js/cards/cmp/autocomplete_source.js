define(['require'], function (require) {
    var contacts = navigator.mozContacts;
    function makeResult(query, contacts) {
        return {
            query: query,
            contacts: contacts
        };
    }
    return function match(query) {
        return new Promise(function (resolve, reject) {
            if (!contacts || !query) {
                return resolve(makeResult(query, []));
            }
            var request = contacts.find({
                filterBy: [
                    'email',
                    'name',
                    'givenName',
                    'familyName'
                ],
                filterOp: 'startsWith',
                filterLimit: 30,
                filterValue: query
            });
            request.onsuccess = function () {
                resolve(makeResult(query, this.result));
            };
            request.onerror = function (err) {
                console.error('autocomplete_source contacts.find error: ' + err);
                resolve(makeResult(query, []));
            };
        });
    };
});