// Create a validator that draws its session from |req|, and reports
// errors on |res|
var Validator = function(req, res) {
   this.errors = [];   // Array of error objects having tag and params
   this.session = req.session;
   this.res = res;
};

// List of errors, and their corresponding resource string tags
Validator.Tags = {
   noLogin: "noLogin",              // No active session/login
   noPermission: "noPermission",    // Login lacks permission.
   missingField: "missingField",    // Field missing. Params[0] is field name
   badValue: "badValue",            // Field has bad arams[0] gives field e
   notFound: "notFound",            // Entity not present in DB
   badLogin: "badLogin",            // Email/password combination invalid
   dupEmail: "dupEmail",            // Email duplicates an existing email
   noTerms: "noTerms",              // Acceptance of terms is required.
   forbiddenRole: "forbiddenRole",  // Cannot set to this role
   noOldPwd: "noOldPwd",            // Change of password requires password
   dupTitle: "dupTitle",            // Title duplicates an existing Conver
   dupEntry: "dupEntry",            // Duplicate movie entry
   dupReview: "dupReview",          // Duplicate review on a movie
   queryFailed: "queryFailed",
   forbiddenField: "forbiddenField",
   oldPwdMismatch: "oldPwdMismatch"
};

// Check |test|.  If false, add an error with tag and possibly empty array
// of qualifying parameters, e.g. name of missing field if tag is
// Tags.missingField.
//
// Regardless, check if any errors have accumulated, and if so, close the
// response with a 400 and a list of accumulated errors, and throw
//  this validator as an error to |cb|, if present.  Thus,
// |check| may be used as an "anchor test" after other tests have run w/o
// immediately reacting to accumulated errors (e.g. checkFields and chain)
// and it may be relied upon to close a response with an appropriate error
// list and call an error handler (e.g. a waterfall default function),
// leaving the caller to cover the "good" case only.
Validator.prototype.check = function(test, tag, params, cb) {
   if (!test)
      this.errors.push({tag: tag, params: params});

   if (this.errors.length) {
      if (this.res) {
         if (this.errors[0].tag === Validator.Tags.noPermission)
            this.res.status(403).end();
         else
            this.res.status(400).json(this.errors);
         this.res = null;   // Preclude repeated closings
      }
      if (cb)
         cb(this);
   }
   return !this.errors.length;
};

// Somewhat like |check|, but designed to allow several chained checks
// in a row, finalized by a check call.
Validator.prototype.chain = function(test, tag, params) {
   if (!test) {
      this.errors.push({tag: tag, params: params});
   }
   return this;
};

Validator.prototype.checkAdmin = function(cb) {
   return this.check(this.session && this.session.isAdmin(),
    Validator.Tags.noPermission, null, cb);
};

// Validate that AU is the specified person or is an admin
Validator.prototype.checkUsrOK = function(usrId, cb) {

   var val = this.check(this.session &&
    (this.session.isAdmin() || this.session.id == usrId),
    Validator.Tags.noPermission, null, cb);
   return val;
};

// Check presence of truthy property in |obj| for all fields in fieldList
Validator.prototype.hasFields = function(obj, fieldList, cb) {
   var self = this;

   fieldList.forEach(function(name) {
      self.chain(obj.hasOwnProperty(name) && obj[name] !== "",
       Validator.Tags.missingField, [name]);
   });

   return this.check(true, null, null, cb);
};

Validator.prototype.hasOnlyFields = function(obj, fieldList, cb) {
   var badFields = [];
   var self = this;

   Object.keys(obj).forEach(function(objKey) {
      if (fieldList.indexOf(objKey) === -1)
         badFields.push(objKey);
   });

   badFields.forEach(function(name) {
      self.chain(false, Validator.Tags.forbiddenField, [name])
   });

   return this.check(true, null, null, cb);
};

Validator.prototype.hasPassword = function(obj) {

}


module.exports = Validator;
