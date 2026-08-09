from html.parser import HTMLParser
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]


class PageContractParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.classes = set()
        self.scripts = []
        self.stylesheets = []
        self.images = []
        self.links = []
        self.attributes_by_id = {}
        self.channel_labels = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"])
            self.attributes_by_id[values["id"]] = values
        self.classes.update(values.get("class", "").split())
        if "content-channel" in values.get("class", "").split():
            self.channel_labels.append(values.get("aria-label"))
        if tag == "script" and values.get("src"):
            self.scripts.append(values["src"])
        if tag == "link" and values.get("rel") == "stylesheet":
            self.stylesheets.append(values.get("href", ""))
        if tag == "img" and values.get("src"):
            self.images.append(values["src"])
        if tag == "a" and values.get("href"):
            self.links.append(values["href"])


class HomeThemeContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.parser = PageContractParser()
        cls.parser.feed(cls.html)

    def test_home_exposes_compact_content_hub_without_growth_journey(self):
        self.assertIn("themeAtmosphere", self.parser.ids)
        self.assertIn("contentHub", self.parser.ids)
        self.assertIn("featuredPanel", self.parser.ids)
        self.assertNotIn("growthJourney", self.parser.ids)
        self.assertTrue({"theme-hero", "content-channel"}.issubset(self.parser.classes))
        self.assertNotIn("growth-stage", self.parser.classes)

    def test_theme_assets_are_loaded(self):
        self.assertIn("theme.css", self.parser.stylesheets)
        self.assertIn("theme-background.js", self.parser.scripts)
        self.assertTrue((ROOT / "theme.css").is_file())
        self.assertTrue((ROOT / "theme-background.js").is_file())

    def test_control_engineering_channels_are_declared(self):
        self.assertEqual(
            set(self.parser.channel_labels),
            {"本科成长与考研认知", "择校决策与数据工具", "读研发展与就业路径"},
        )
        self.assertIn("controlSchematic", self.parser.ids)
        self.assertIn("control-signal-dot", self.parser.classes)

    def test_feedback_ribbon_is_a_prominent_accessible_hero_layer(self):
        self.assertIn("feedbackRibbon", self.parser.ids)
        self.assertIn("heroSignalCanvas", self.parser.ids)
        self.assertEqual(
            self.parser.attributes_by_id["feedbackRibbon"].get("aria-label"),
            "闭环反馈控制系统示意图",
        )
        self.assertTrue(
            {"feedback-ribbon", "feedback-node", "feedback-return-label"}.issubset(
                self.parser.classes
            )
        )
        hero_canvas = self.parser.attributes_by_id["heroSignalCanvas"]
        self.assertEqual(
            hero_canvas.get("data-motifs"),
            "directional-signal-particles node-glow feedback-loop",
        )

    def test_blueprint_theme_replaces_formula_particle_theme(self):
        self.assertIn("homeHero", self.parser.attributes_by_id)
        hero = self.parser.attributes_by_id["homeHero"]
        canvas = self.parser.attributes_by_id["themeAtmosphere"]
        self.assertEqual(hero.get("data-theme"), "blueprint-system")
        self.assertEqual(
            canvas.get("data-motifs"),
            "blueprint-grid feedback-signal scanline",
        )
        self.assertIn("blueprint-scanline", self.parser.classes)
        self.assertNotIn("control-schematic-labels", self.parser.classes)

    def test_existing_business_hooks_remain_available(self):
        required_ids = {
            "homePage", "heatRankSection", "heatRankButtons", "filterRegion",
            "filterTier", "filterProvince", "filterSchool", "filterMath2Eng2",
            "filterCollege", "filterTag", "filterMajor", "filter0854", "favBtn",
            "mainContentArea", "schoolSearch", "schoolCount", "detailTable",
            "countdownDays27", "countdownDays28", "countdownCET",
        }
        self.assertTrue(required_ids.issubset(self.parser.ids))
        self.assertIn("index.js", self.parser.scripts)

    def test_original_icons_and_key_destinations_are_preserved(self):
        self.assertTrue(any("avatar_azhu.jpg" in src for src in self.parser.images))
        self.assertTrue(any("B站" in src or "B绔" in src for src in self.parser.images))
        self.assertIn("heat_compare.html", self.parser.links)
        self.assertIn("院校PK.html", self.parser.links)

    def test_course_resources_entry_uses_signal_gold_theme_without_changing_destination(self):
        self.assertIn("courseResourcesCard", self.parser.ids)
        entry = self.parser.attributes_by_id["courseResourcesCard"]
        self.assertEqual(entry.get("href"), "专业课选择/资料和课程.html")
        self.assertEqual(entry.get("data-theme"), "control-signal-gold")
        self.assertTrue(
            {
                "course-entry-card",
                "course-entry-icon",
                "course-entry-title",
                "course-entry-tag",
            }.issubset(self.parser.classes)
        )

    def test_heat_rank_and_filter_entry_share_decision_console_theme(self):
        heat_rank = self.parser.attributes_by_id["heatRankSection"]
        workbench = self.parser.attributes_by_id["selectionWorkbench"]
        self.assertEqual(heat_rank.get("data-theme"), "decision-console")
        self.assertEqual(workbench.get("data-theme"), "decision-console")
        self.assertIn("decision-console-content", self.parser.classes)

        css = (ROOT / "theme.css").read_text(encoding="utf-8")
        self.assertIn('[data-theme="decision-console"]', css)
        self.assertIn('.decision-console-content', css)
        self.assertIn('.selection-workbench[data-theme="decision-console"]', css)

    def test_school_list_uses_isolated_data_bay_background(self):
        self.assertIn("schoolDataField", self.parser.ids)
        main = self.parser.attributes_by_id["mainContentArea"]
        field = self.parser.attributes_by_id["schoolDataField"]
        self.assertEqual(main.get("data-theme"), "school-data-bay")
        self.assertEqual(
            field.get("data-motifs"),
            "data-stream split-nodes radar-glow vertical-data-bus",
        )
        self.assertEqual(field.get("aria-hidden"), "true")
        self.assertIn("school-list-card", self.parser.classes)
        self.assertTrue(
            {"schoolTable", "schoolPagination", "schoolSearch"}.issubset(
                self.parser.ids
            )
        )


if __name__ == "__main__":
    unittest.main()
