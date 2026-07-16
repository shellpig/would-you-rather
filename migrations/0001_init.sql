-- 規格書 §5.1 schema,一字不差。
CREATE TABLE stats (
  quiz_id     TEXT,
  question_id TEXT,
  a_count     INTEGER DEFAULT 0,
  b_count     INTEGER DEFAULT 0,
  PRIMARY KEY (quiz_id, question_id)
);
