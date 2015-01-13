levelup = require("levelup")
levelgraph = require("../")
tmp = require("tmp")
tmp.dir (err, dir) ->
  if err
    console.log err
    process.exit 1
  db = levelgraph(levelup(dir))
  db.put [
    subject: "电器"
    predicate: "动力"
    object: "电"
  ,
    subject: "特斯拉"
    predicate: "动力"
    object: "电"
  ,
    subject: "大众"
    predicate: "动力"
    object: "汽油"
  ,
    subject: "大众"
    predicate: "是"
    object: "汽车"
  ,
    subject: "𠁩"
    predicate: "动力"
    object: "电"
  ,
    subject: "𠁩"
    predicate: "是"
    object: "汽车"
  ,
    subject: "特斯拉"
    predicate: "是"
    object: "汽车"
  ,
    subject: "混合动力汽车"
    predicate: "动力"
    object: '电'
  ,
    subject: "混合动力汽车"
    predicate: "是"
    object: "汽车"
  ,
    subject: "混合动力汽车"
    predicate: "动力"
    object: '汽油'
  ,
    subject: "电"
    predicate: "量"
    object: "度"
  ,
    subject: "电"
    predicate: "来源"
    object: "煤"
  ,
    subject: "电"
    predicate: "来源"
    object: "核能"
  ,
    subject: "汽油"
    predicate: "是"
    object: "油"
  ], ->
    # 
    db.nav("汽车").archIn("是").archOut("动力").bind("电").triples (err, results) ->
      console.log "nav:", results

    db.search [
      subject: db.v("x0")
      predicate: "是"
      object: "汽车"
    ,
      subject: db.v("x0")
      predicate: "动力"
      object: "电"
    ], (err, results) ->
      console.log "search:",results



