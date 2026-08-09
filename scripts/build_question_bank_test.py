import copy
import unittest

from scripts.build_question_bank import assign_stable_ids, build_report, normalized_answer


def raw_question(source_key: str, answer: str = "A", question: str = "題目"):
    chapter = source_key.split(":", 1)[0]
    return {
        "sourceKey": source_key,
        "sourceChapter": chapter,
        "sourceChapterTitle": "章節",
        "sourceQuestionNo": source_key.split(":", 1)[1],
        "question": question,
        "options": {"A": "甲", "B": "乙", "C": "丙", "D": "丁"},
        "answer": answer,
        "explanation": "",
        "_sourceFile": "test.xlsx",
        "_sourceRow": 2,
    }


class QuestionBankBuilderTests(unittest.TestCase):
    def test_answer_allows_excel_period_but_rejects_multiple_answers(self):
        self.assertEqual(normalized_answer("D."), "D")
        self.assertEqual(normalized_answer(" a "), "A")
        self.assertIsNone(normalized_answer("C./A."))

    def test_existing_key_keeps_id_and_new_key_gets_next_id(self):
        mapping = {
            "schemaVersion": 1,
            "nextStableQuestionId": 8,
            "questions": {"chapter-01:1": {"stableQuestionId": 3}},
        }
        assigned, new_keys = assign_stable_ids(
            [raw_question("chapter-01:1"), raw_question("chapter-01:2")], mapping
        )
        self.assertEqual([item["stableQuestionId"] for item in assigned], [3, 8])
        self.assertEqual(new_keys, ["chapter-01:2"])
        self.assertEqual(mapping["nextStableQuestionId"], 9)

    def test_report_distinguishes_answer_change_add_and_remove(self):
        mapping = {
            "schemaVersion": 1,
            "nextStableQuestionId": 4,
            "questions": {
                "chapter-01:1": {"stableQuestionId": 1},
                "chapter-01:2": {"stableQuestionId": 2},
                "chapter-01:3": {"stableQuestionId": 3},
            },
        }
        current, new_keys = assign_stable_ids(
            [raw_question("chapter-01:1", "C"), raw_question("chapter-01:3")],
            copy.deepcopy(mapping),
        )
        previous = [
            {"id": 1, **raw_question("chapter-01:1", "A")},
            {"id": 2, **raw_question("chapter-01:2", "B")},
        ]
        report = build_report(previous, current, ["chapter-01:3"], mapping)
        self.assertEqual(report["answerChangedQuestionCount"], 1)
        self.assertEqual(report["addedQuestionCount"], 1)
        self.assertEqual(report["removedQuestionCount"], 1)


if __name__ == "__main__":
    unittest.main()
