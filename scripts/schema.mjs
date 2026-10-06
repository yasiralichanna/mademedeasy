export async function initialize(db) {
 const indexes = {
 users: [[{id:1},{unique:true}],[{email:1},{unique:true}],[{role:1},{unique:true,partialFilterExpression:{role:'admin'},name:'first_admin_only'}]],
 sessions: [[{token:1},{unique:true}],[{user_id:1},{}]], resets: [[{token:1},{unique:true}]], limits: [[{key:1},{unique:true}]], profiles: [[{user_id:1},{unique:true}]],
 packages: [[{id:1},{unique:true}]], settings: [[{key:1},{unique:true}]],
 payments: [[{id:1},{unique:true}],[{user_id:1},{unique:true,partialFilterExpression:{status:'pending'},name:'one_pending_payment'}],[{reference:1,method:1},{}]],
 subscriptions: [[{id:1},{unique:true}],[{payment_id:1},{unique:true}],[{user_id:1,status:1,expires:1},{}]],
 categories: [[{id:1},{unique:true}]], questions: [[{id:1},{unique:true}],[{status:1,year:1,module:1},{}]],
 attempts: [[{id:1},{unique:true}],[{user_id:1,created:-1},{}]], bookmarks: [[{id:1},{unique:true}],[{user_id:1,question_id:1},{unique:true}]],
 notifications: [[{id:1},{unique:true}],[{user_id:1,created:-1},{}]], audit: [[{id:1},{unique:true}],[{created:-1},{}]]
 };
 for(const [name,list] of Object.entries(indexes)) for(const [keys,options] of list) await db.collection(name).createIndex(keys,options);
 const validators = {
  users: {required:['id','email','name','mobile','password','role','created'],properties:{role:{enum:['student','admin']}}},
  profiles: {required:['user_id','cnic','college','year'],properties:{year:{enum:[1,2,3,4,5]}}},
  payments: {required:['id','user_id','package_id','snapshot','proof','status'],properties:{status:{enum:['pending','approved','rejected']}}},
  subscriptions: {required:['id','user_id','payment_id','scope','starts','expires','status'],properties:{status:{enum:['active','suspended']}}},
  questions: {required:['id','stem','options','correct','status'],properties:{status:{enum:['draft','published','archived']}}},
  attempts: {required:['id','user_id','mode','items','answers','flags'],properties:{mode:{enum:['practice','module','final']}}}
 };
 for(const [name,schema] of Object.entries(validators)) await db.command({collMod:name,validator:{$jsonSchema:{bsonType:'object',...schema}},validationLevel:'strict',validationAction:'error'});
}
