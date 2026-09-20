(function () {
    var data = window.__ANTIGRAVITY_I18N_DATA__ || {};
    var EXACT = data.exact || {};
    var REVERSE_MAP = data.reverse_map || {};
    var REGEX_RULES = [];
    if (Array.isArray(data.regex_rules)) {
        for (var i = 0; i < data.regex_rules.length; i++) {
            try {
                REGEX_RULES.push({
                    re: new RegExp(data.regex_rules[i].pattern, data.regex_rules[i].flags || "i"),
                    rep: data.regex_rules[i].replacement
                });
            } catch (e) {}
        }
    }
    var EXEMPTIONS = data.exemptions || [];

    // Always update global store on new data injection
    window.__ANTIGRAVITY_EXACT__ = Object.assign(window.__ANTIGRAVITY_EXACT__ || {}, EXACT);
    window.__ANTIGRAVITY_REVERSE_MAP__ = Object.assign(window.__ANTIGRAVITY_REVERSE_MAP__ || {}, REVERSE_MAP);
    window.__ANTIGRAVITY_REGEX_RULES__ = REGEX_RULES;
    window.__ANTIGRAVITY_EXEMPTIONS__ = EXEMPTIONS;

    // Fast O(1) case-insensitive lookup table
    var LOWER_EXACT = Object.create(null);
    function rebuildLowerMap(source) {
        LOWER_EXACT = Object.create(null);
        for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                LOWER_EXACT[key.toLowerCase()] = source[key];
            }
        }
    }
    rebuildLowerMap(window.__ANTIGRAVITY_EXACT__);

    // Global translation helper reference
    window.__antigravity_getTranslatedText = getTranslatedText;

    // 1. Controlled Component Reverse Map Hook (Protects Base UI / Radix Select states)
    function resolveReverseKey(key) {
        if (typeof key !== "string") return undefined;
        var rev = window.__ANTIGRAVITY_REVERSE_MAP__ || REVERSE_MAP;
        if (rev[key]) return rev[key];

        // Dynamic model suffix reverse mappings
        if (/\s*\(思考\)$/.test(key)) return key.replace(/\s*\(思考\)$/, " (Thinking)");
        if (/\s*\(中\)$/.test(key)) return key.replace(/\s*\(中\)$/, " (Medium)");
        if (/\s*\(高\)$/.test(key)) return key.replace(/\s*\(高\)$/, " (High)");
        if (/\s*\(低\)$/.test(key)) return key.replace(/\s*\(低\)$/, " (Low)");

        if (key.indexOf("是，并在此会话中始终允许") === 0) {
            return key.replace(/^是，并在此会话中始终允许\s+(.*?)$/, "Yes, and always allow $1 in this conversation");
        }
        if (key.indexOf("是，并在未关联项目时始终允许") === 0) {
            return key.replace(/^是，并在未关联项目时始终允许\s+(.*?)$/, "Yes, and always allow $1 when not in a project");
        }
        if (key.indexOf("是，并在此项目中始终允许") === 0) {
            return key.replace(/^是，并在此项目中始终允许\s+(.*?)$/, "Yes, and always allow $1 in this project");
        }
        if (key.indexOf("是，并始终允许") === 0) {
            return key.replace(/^是，并始终允许\s+(.*?)$/, "Yes, and always allow $1");
        }
        if (key === "否" || key === "否 (向智能体提供其他指示)") {
            return key === "否" ? "No" : "No (tell the agent what to do instead)";
        }
        if (key === "是") {
            return "Yes";
        }
        if (key === "请求审查" || key === "请求审批") {
            return "Request Review";
        }
        if (key === "已禁用") {
            return "Disabled";
        }
        if (key === "自动继续") {
            return "Always Proceed";
        }
        if (key === "整机模式" || key === "整机") {
            return "Full machine";
        }
        if (key === "在沙箱中继续") {
            return "Proceed in Sandbox";
        }
        if (key === "需要审批") {
            return "Require Review";
        }
        if (key === "沿用全局" || key === "继承全局") {
            return "Inherit Global";
        }
        if (key === "自定义") {
            return "Custom";
        }
        if (key === "高对比度" || key === "强对比") {
            return "Strong";
        }
        if (key === "继承编辑器主题") {
            return "Inherit Editor";
        }
        return undefined;
    }

    if (!window.__antigravity_map_hooked) {
        window.__antigravity_map_hooked = true;
        var origHas = Map.prototype.has;
        var origGet = Map.prototype.get;

        Map.prototype.has = function (key) {
            if (origHas.call(this, key)) return true;
            var mapped = resolveReverseKey(key);
            if (mapped) return origHas.call(this, mapped);
            return false;
        };

        Map.prototype.get = function (key) {
            var val = origGet.call(this, key);
            if (val !== undefined) return val;
            var mapped = resolveReverseKey(key);
            if (mapped) return origGet.call(this, mapped);
            return undefined;
        };
    }

    // 2. Isolation & Exemption Checks
    var EXCLUDED_TAGS = {
        "SCRIPT": true,
        "STYLE": true,
        "PRE": true,
        "CODE": true,
        "TEXTAREA": true
    };

    function isInsideExcluded(node) {
        if (!node) return false;
        var curr = node.nodeType === 3 ? node.parentNode : node;
        while (curr && curr !== document.body && curr !== document.documentElement) {
            if (curr.nodeType === 1) {
                var tag = curr.tagName;
                if (EXCLUDED_TAGS[tag]) return true;
                if (curr.isContentEditable) return true;
                var cls = curr.className;
                if (typeof cls === "string" && (
                    cls.indexOf("monaco-editor") !== -1 ||
                    cls.indexOf("token") !== -1 ||
                    cls.indexOf("syntax") !== -1
                )) {
                    return true;
                }
            }
            curr = curr.parentNode;
        }
        return false;
    }

    function isExempt(text) {
        var exemptions = window.__ANTIGRAVITY_EXEMPTIONS__ || EXEMPTIONS;
        for (var i = 0; i < exemptions.length; i++) {
            if (text.indexOf(exemptions[i]) !== -1) {
                return true;
            }
        }
        return false;
    }

    function getTranslatedText(original) {
        if (typeof original !== "string") return null;
        var trimmed = original.trim();
        if (!trimmed) return null;

        // Ultra-fast rejection: Skip if string contains no Latin/ASCII letters
        if (!/[a-zA-Z]/.test(trimmed)) return null;
        if (isExempt(original)) return null;

        var exactMap = window.__ANTIGRAVITY_EXACT__ || EXACT;
        var regexList = window.__ANTIGRAVITY_REGEX_RULES__ || REGEX_RULES;

        // 1. Exact match (O(1))
        if (exactMap[trimmed]) {
            var target = exactMap[trimmed];
            var leading = original.match(/^\s*/)[0];
            var trailing = original.match(/\s*$/)[0];
            return leading + target + trailing;
        }

        // 2. Trailing punctuation normalization
        var noDot = trimmed.replace(/\.+$/, "");
        if (noDot !== trimmed && exactMap[noDot]) {
            var targetNoDot = exactMap[noDot];
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + targetNoDot + trail;
        }

        // 2.1 Model Suffix parenthesized rules (Thinking / Medium / High / Low)
        if (/\((?:Thinking|Medium|High|Low)\)$/i.test(trimmed)) {
            var transModel = trimmed
                .replace(/\(Thinking\)$/i, "(思考)")
                .replace(/\(Medium\)$/i, "(中)")
                .replace(/\(High\)$/i, "(高)")
                .replace(/\(Low\)$/i, "(低)");
            var leadM = original.match(/^\s*/)[0];
            var trailM = original.match(/\s*$/)[0];
            return leadM + transModel + trailM;
        }

        // 2.5 Explored / Exploring dynamic combinations
        if (/^(Explored|Exploring)\s+/i.test(trimmed)) {
            var isPast = /^Explored/i.test(trimmed);
            var prefix = isPast ? "检索了 " : "正在检索 ";
            var rest = trimmed.replace(/^(Explored|Exploring)\s+/i, "");
            var translatedRest = rest
                .replace(/(\d+)\s+files?/gi, "$1 个文件")
                .replace(/(\d+)\s+folders?/gi, "$1 个文件夹")
                .replace(/(\d+)\s+search(?:es)?/gi, "$1 次搜索")
                .replace(/(?:ran|running)\s+(\d+)\s+commands?/gi, isPast ? "运行了 $1 条命令" : "正在执行 $1 条命令")
                .replace(/(\d+)\s+commands?/gi, "$1 条命令")
                .replace(/,\s*/g, "，");
            var leadExp = original.match(/^\s*/)[0];
            var trailExp = original.match(/\s*$/)[0];
            return leadExp + prefix + translatedRest + trailExp;
        }

        // 2.6 Rate limit & Quota dynamic text (Full English)
        if (/^You have (?:used|reached|exhausted)/i.test(trimmed)) {
            var transQuota = trimmed
                .replace(/^You have used some of your\s+/i, "您已使用部分")
                .replace(/^You have used all of your\s+/i, "您已用尽所有")
                .replace(/^You have exhausted your\s+/i, "您已用尽")
                .replace(/^You have reached your\s+/i, "您已达到")
                .replace(/\s*\bweekly\s+limit\b/gi, "每周限额")
                .replace(/\s*\bdaily\s+limit\b/gi, "每日限额")
                .replace(/\s*\bmonthly\s+limit\b/gi, "每月限额")
                .replace(/\s*(\d+)-hour\s+limit/gi, " $1 小时限额")
                .replace(/\s*(\d+)-day\s+limit/gi, " $1 天限额")
                .replace(/,?\s*it will (?:fully )?refresh in\s+/gi, "，将在 ")
                .replace(/(\d+)\s+days?/gi, "$1 天")
                .replace(/(\d+)\s+hours?/gi, "$1 小时")
                .replace(/(\d+)\s+minutes?/gi, "$1 分钟")
                .replace(/(\d+)\s+seconds?/gi, "$1 秒")
                .replace(/,\s*/g, " ")
                .replace(/\s+后/g, "后")
                .replace(/\.$/, "后完全刷新恢复。");
            transQuota = transQuota.replace(/后(?:完全(?:刷新)?)?恢复。后完全刷新恢复。$/, "后完全刷新恢复。");
            var leadQ = original.match(/^\s*/)[0];
            var trailQ = original.match(/\s*$/)[0];
            return leadQ + transQuota + trailQ;
        }

        // 2.61 Quota string already partially translated containing days/hours/minutes/seconds
        if (/(?:将在|限额|恢复).*?\b(?:days?|hours?|minutes?|seconds?)\b/i.test(trimmed)) {
            var transHalf = trimmed
                .replace(/(\d+)\s+days?/gi, "$1 天")
                .replace(/(\d+)\s+hours?/gi, "$1 小时")
                .replace(/(\d+)\s+minutes?/gi, "$1 分钟")
                .replace(/(\d+)\s+seconds?/gi, "$1 秒")
                .replace(/,\s*/g, " ")
                .replace(/\s+后/g, "后");
            var leadH = original.match(/^\s*/)[0];
            var trailH = original.match(/\s*$/)[0];
            return leadH + transHalf + trailH;
        }

        // 2.62 Standalone duration strings (e.g. "6 days, 21 hours", "2 hours, 50 minutes", "3 hours, 7 minutes")
        if (/^(?:(\d+)\s+days?,?\s*)?(?:(\d+)\s+hours?,?\s*)?(?:(\d+)\s+minutes?,?\s*)?(?:(\d+)\s+seconds?)?$/i.test(trimmed) && /\b(?:days?|hours?|minutes?|seconds?)\b/i.test(trimmed)) {
            var transDur = trimmed
                .replace(/(\d+)\s+days?/gi, "$1 天")
                .replace(/(\d+)\s+hours?/gi, "$1 小时")
                .replace(/(\d+)\s+minutes?/gi, "$1 分钟")
                .replace(/(\d+)\s+seconds?/gi, "$1 秒")
                .replace(/,\s*/g, " ")
                .trim();
            var leadD = original.match(/^\s*/)[0];
            var trailD = original.match(/\s*$/)[0];
            return leadD + transDur + trailD;
        }

        // 2.7 Resets in dynamic text
        if (/^Resets in\s+/i.test(trimmed)) {
            var transReset = trimmed
                .replace(/^Resets in\s+<1m/i, "<1 分钟后重置")
                .replace(/^Resets in\s+(\d+)d\s+(\d+)h/i, "$1 天 $2 小时后重置")
                .replace(/^Resets in\s+(\d+)d/i, "$1 天后重置")
                .replace(/^Resets in\s+(\d+)h\s+(\d+)m/i, "$1 小时 $2 分钟后重置")
                .replace(/^Resets in\s+(\d+)h/i, "$1 小时后重置")
                .replace(/^Resets in\s+(\d+)m/i, "$1 分钟后重置");
            var leadR = original.match(/^\s*/)[0];
            var trailR = original.match(/\s*$/)[0];
            return leadR + transReset + trailR;
        }

        // 2.75 Undo action error message
        if (/^There was an error determining the code changes that this undo action will make:\s*/i.test(trimmed)) {
            var transErr = trimmed.replace(/^There was an error determining the code changes that this undo action will make:\s*/i, "确定此撤销操作将导致的代码更改时出错：");
            var leadU = original.match(/^\s*/)[0];
            var trailU = original.match(/\s*$/)[0];
            return leadU + transErr + trailU;
        }

        // 3. Regex dynamic rules
        for (var i = 0; i < regexList.length; i++) {
            if (regexList[i].re.test(trimmed)) {
                var replaced = trimmed.replace(regexList[i].re, regexList[i].rep);
                var leadRg = original.match(/^\s*/)[0];
                var trailRg = original.match(/\s*$/)[0];
                return leadRg + replaced + trailRg;
            }
        }

        // 4. Case-insensitive O(1) hash table lookup (Zero linear loop iterations)
        var lowerVal = trimmed.toLowerCase();
        if (LOWER_EXACT[lowerVal]) {
            var matchedTarget = LOWER_EXACT[lowerVal];
            var leadCi = original.match(/^\s*/)[0];
            var trailCi = original.match(/\s*$/)[0];
            return leadCi + matchedTarget + trailCi;
        }

        return null;
    }
    window.__antigravity_getTranslatedText = getTranslatedText;

    // 2.8 Synchronous DOM Text & Attribute Setters Interceptors
    function hookPlaceholder(proto) {
        try {
            if (!proto) return;
            var desc = Object.getOwnPropertyDescriptor(proto, "placeholder");
            if (desc && desc.set && !proto.__antigravity_placeholder_hooked) {
                proto.__antigravity_placeholder_hooked = true;
                var origSet = desc.set;
                Object.defineProperty(proto, "placeholder", {
                    get: desc.get,
                    set: function (val) {
                        if (typeof val === "string") {
                            var trans = getTranslatedText(val);
                            if (trans !== null) val = trans;
                        }
                        return origSet.call(this, val);
                    },
                    configurable: true,
                    enumerable: true
                });
            }
        } catch (e) {}
    }
    if (typeof HTMLTextAreaElement !== "undefined") hookPlaceholder(HTMLTextAreaElement.prototype);
    if (typeof HTMLInputElement !== "undefined") hookPlaceholder(HTMLInputElement.prototype);

    if (typeof Element !== "undefined" && !Element.prototype.__antigravity_set_attr_hooked) {
        Element.prototype.__antigravity_set_attr_hooked = true;
        var origSetAttr = Element.prototype.setAttribute;
        Element.prototype.setAttribute = function (name, val) {
            if (typeof val === "string") {
                var lower = name.toLowerCase();
                if (
                    lower === "placeholder" ||
                    lower === "title" ||
                    lower === "aria-label" ||
                    lower === "data-tooltip-content" ||
                    lower === "data-title"
                ) {
                    var trans = getTranslatedText(val);
                    if (trans !== null) {
                        val = trans;
                    }
                }
            }
            return origSetAttr.call(this, name, val);
        };
    }

    // Synchronous Node text & content setter hooks (eliminates async flicker & catches rapid tooltip changes)
    if (typeof Node !== "undefined") {
        try {
            var nodeProto = Node.prototype;
            var descVal = Object.getOwnPropertyDescriptor(nodeProto, "nodeValue");
            if (descVal && descVal.set && !nodeProto.__antigravity_nodevalue_hooked) {
                nodeProto.__antigravity_nodevalue_hooked = true;
                var origSetVal = descVal.set;
                Object.defineProperty(nodeProto, "nodeValue", {
                    get: descVal.get,
                    set: function (val) {
                        if (typeof val === "string" && val.length > 0 && !isInsideExcluded(this)) {
                            var trans = getTranslatedText(val);
                            if (trans !== null) {
                                val = trans;
                            }
                        }
                        return origSetVal.call(this, val);
                    },
                    configurable: true,
                    enumerable: true
                });
            }

            var descText = Object.getOwnPropertyDescriptor(nodeProto, "textContent");
            if (descText && descText.set && !nodeProto.__antigravity_textcontent_hooked) {
                nodeProto.__antigravity_textcontent_hooked = true;
                var origSetText = descText.set;
                Object.defineProperty(nodeProto, "textContent", {
                    get: descText.get,
                    set: function (val) {
                        if (typeof val === "string" && val.length > 0 && !isInsideExcluded(this)) {
                            var trans = getTranslatedText(val);
                            if (trans !== null) {
                                val = trans;
                            }
                        }
                        return origSetText.call(this, val);
                    },
                    configurable: true,
                    enumerable: true
                });
            }
        } catch (e) {}
    }

    // 3. Node Translation Engine (Pure value matching + TextNode Fragmentation Self-Healing)
    function translateTextNode(textNode) {
        if (!textNode || textNode.nodeType !== 3) return;

        // Check if parent has multiple sliced text nodes (JSX fragmentation e.g. "No " + "projects" + " found")
        var parent = textNode.parentNode;
        if (parent && parent.nodeType === 1 && !isInsideExcluded(parent)) {
            if (parent.childNodes.length > 1) {
                var textNodes = [];
                var onlyTextOrComment = true;
                for (var i = 0; i < parent.childNodes.length; i++) {
                    var c = parent.childNodes[i];
                    if (c.nodeType === 3) {
                        textNodes.push(c);
                    } else if (c.nodeType !== 8) {
                        onlyTextOrComment = false;
                        break;
                    }
                }
                // Only collapse if there are genuinely multiple non-whitespace text nodes
                var nonWhitespaceCount = 0;
                for (var k = 0; k < textNodes.length; k++) {
                    if (textNodes[k].nodeValue.trim().length > 0) nonWhitespaceCount++;
                }
                if (onlyTextOrComment && nonWhitespaceCount > 1) {
                    var combined = parent.textContent;
                    var transCombined = getTranslatedText(combined);
                    if (transCombined !== null && transCombined !== combined) {
                        textNodes[0].nodeValue = transCombined;
                        for (var j = 1; j < textNodes.length; j++) {
                            textNodes[j].nodeValue = "";
                        }
                        return;
                    }
                }
            }
        }

        var val = textNode.nodeValue;
        if (!val || !val.trim()) return;
        if (isInsideExcluded(textNode)) return;

        var getTrans = window.__antigravity_getTranslatedText || getTranslatedText;
        var translated = getTrans(val);
        if (translated !== null && translated !== val) {
            textNode.nodeValue = translated;
        }
    }

    function translateElementAttributes(el) {
        if (!el || el.nodeType !== 1) return;
        if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return;

        var getTrans = window.__antigravity_getTranslatedText || getTranslatedText;

        // placeholder
        if (el.hasAttribute("placeholder")) {
            var ph = el.getAttribute("placeholder");
            var tPh = getTrans(ph);
            if (tPh !== null && tPh !== ph) {
                el.setAttribute("placeholder", tPh);
                try { el.placeholder = tPh; } catch (e) {}
            }
        } else if (typeof el.placeholder === "string" && el.placeholder) {
            var phP = el.placeholder;
            var tPhP = getTrans(phP);
            if (tPhP !== null && tPhP !== phP) {
                try { el.placeholder = tPhP; } catch (e) {}
                el.setAttribute("placeholder", tPhP);
            }
        }
        // title
        if (el.hasAttribute("title")) {
            var tit = el.getAttribute("title");
            var tTit = getTrans(tit);
            if (tTit !== null && tTit !== tit) el.setAttribute("title", tTit);
        }
        // aria-label
        if (el.hasAttribute("aria-label")) {
            var al = el.getAttribute("aria-label");
            var tAl = getTrans(al);
            if (tAl !== null && tAl !== al) el.setAttribute("aria-label", tAl);
        }
        // data-title
        if (el.hasAttribute("data-title")) {
            var dt = el.getAttribute("data-title");
            var tDt = getTrans(dt);
            if (tDt !== null && tDt !== dt) el.setAttribute("data-title", tDt);
        }
        // data-tooltip
        if (el.hasAttribute("data-tooltip")) {
            var dtt = el.getAttribute("data-tooltip");
            var tDtt = getTrans(dtt);
            if (tDtt !== null && tDtt !== dtt) el.setAttribute("data-tooltip", tDtt);
        }
        // data-tooltip-content
        if (el.hasAttribute("data-tooltip-content")) {
            var dtc = el.getAttribute("data-tooltip-content");
            var tDtc = getTrans(dtc);
            if (tDtc !== null && tDtc !== dtc) el.setAttribute("data-tooltip-content", tDtc);
        }
    }

    var SHORTCUT_TOOLTIP_REGEX = /^(.*?)\s*\(?((?:(?:Ctrl|Alt|Shift|[⌃⌥⇧⌘])[+\s0-9A-Za-z,]+)|Enter|Tab|Esc)\)?$/i;

    function formatTooltipElement(el) {
        if (!el || el.nodeType !== 1) return;
        if (el.classList.contains("opacity-50") || el.querySelector(".opacity-50") || el.closest(".opacity-50")) return;

        var getTrans = window.__antigravity_getTranslatedText || getTranslatedText;

        var childDivs = el.querySelectorAll("div");
        if (childDivs.length > 0) {
            var anyFormatted = false;
            for (var i = 0; i < childDivs.length; i++) {
                var d = childDivs[i];
                if (d.querySelector(".opacity-50") || d.classList.contains("opacity-50")) continue;
                if (d.children.length === 0 || Array.prototype.every.call(d.childNodes, function(n) { return n.nodeType === 3; })) {
                    var raw = d.textContent.trim();
                    var trans = getTrans(raw) || raw;
                    var m = SHORTCUT_TOOLTIP_REGEX.exec(trans);
                    if (m) {
                        var act = m[1].trim();
                        var key = m[2].trim();
                        var actTrans = getTrans(act) || act;
                        d.innerHTML = '<span>' + actTrans + '</span><span class="ml-1 opacity-50">' + key + '</span>';
                        anyFormatted = true;
                    }
                }
            }
            if (anyFormatted) return;
        }

        if (childDivs.length === 0) {
            var rawText = el.textContent.trim();
            var transSingle = getTrans(rawText) || rawText;
            var match = SHORTCUT_TOOLTIP_REGEX.exec(transSingle);
            if (match) {
                var action = match[1].trim();
                var shortcutKey = match[2].trim();
                var actionTrans = getTrans(action) || action;
                el.innerHTML = '<span>' + actionTrans + '</span><span class="ml-1 opacity-50">' + shortcutKey + '</span>';
            }
        }
    }
    window.__antigravity_formatTooltipElement = formatTooltipElement;

    function translateSubtree(root) {
        if (!root) return;
        if (root.nodeType === 3) {
            translateTextNode(root);
            return;
        }
        if (root.nodeType === 1) {
            translateElementAttributes(root);
            if (isInsideExcluded(root)) return;
            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
            var node;
            while ((node = walker.nextNode())) {
                translateTextNode(node);
            }
            if (root.childElementCount > 0) {
                var elementsWithAttrs = root.querySelectorAll("[placeholder], [title], [aria-label], [data-title], [data-tooltip], [data-tooltip-content]");
                for (var i = 0; i < elementsWithAttrs.length; i++) {
                    translateElementAttributes(elementsWithAttrs[i]);
                }
            }
            if (root.matches && root.matches('.compact-tooltip, [role="tooltip"], .react-tooltip')) {
                formatTooltipElement(root);
            } else if (root.childElementCount > 0) {
                var tts = root.querySelectorAll('.compact-tooltip, [role="tooltip"], .react-tooltip');
                for (var t = 0; t < tts.length; t++) {
                    formatTooltipElement(tts[t]);
                }
            }
        }
    }

    // 4. Initial Full Page Translation & Lifecycle Hooks
    function translateWholePage() {
        var target = document.body || document.documentElement;
        if (target) {
            translateSubtree(target);
        }
    }
    window.__antigravity_translateWholePage = translateWholePage;
    window.__antigravity_translateSubtree = translateSubtree;

    translateWholePage();

    if (window.__antigravity_i18n_runner_active) {
        return;
    }
    window.__antigravity_i18n_runner_active = true;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", translateWholePage);
    }
    window.addEventListener("load", translateWholePage);

    // SPA client-side routing triggers
    window.addEventListener("popstate", function() { setTimeout(translateWholePage, 50); });
    window.addEventListener("hashchange", function() { setTimeout(translateWholePage, 50); });

    // Multi-turn progressive scans for React initial async rendering
    var scanDelays = [100, 250, 500, 1000, 1800, 3000, 5000];
    for (var k = 0; k < scanDelays.length; k++) {
        setTimeout(translateWholePage, scanDelays[k]);
    }

    // Virtualized list scroll trigger
    window.addEventListener("scroll", function() {
        if (!isTranslating) {
            setTimeout(translateWholePage, 100);
        }
    }, true);

    // Fast hover & focus translation trigger (immediately translates tooltips)
    window.addEventListener("mouseover", function(e) {
        if (e.target && e.target.nodeType === 1) {
            translateElementAttributes(e.target);
            if (e.target.parentElement) {
                translateElementAttributes(e.target.parentElement);
            }
            // Rapid tooltip scanner: immediately translate any active tooltip container in portals
            var tooltips = document.querySelectorAll('.compact-tooltip, [role="tooltip"], .react-tooltip');
            for (var i = 0; i < tooltips.length; i++) {
                translateSubtree(tooltips[i]);
                formatTooltipElement(tooltips[i]);
            }
        }
    }, true);
    window.addEventListener("focusin", function(e) {
        if (e.target && e.target.nodeType === 1) {
            translateElementAttributes(e.target);
        }
    }, true);

    // 5. High-Performance MutationObserver (observes childList & attribute changes)
    var isTranslating = false;
    var observer = new MutationObserver(function (mutations) {
        if (isTranslating) return;
        isTranslating = true;
        try {
            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === "childList") {
                    for (var j = 0; j < m.addedNodes.length; j++) {
                        translateSubtree(m.addedNodes[j]);
                    }
                    var activeTooltips = document.querySelectorAll('.compact-tooltip, [role="tooltip"], .react-tooltip');
                    for (var at = 0; at < activeTooltips.length; at++) {
                        formatTooltipElement(activeTooltips[at]);
                    }
                } else if (m.type === "attributes") {
                    translateElementAttributes(m.target);
                }
            }
        } finally {
            isTranslating = false;
        }
    });

    function startObserving() {
        var root = document.documentElement || document.body;
        if (root) {
            observer.observe(root, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ["placeholder", "title", "aria-label", "data-tooltip-content", "data-title"]
            });
        } else {
            setTimeout(startObserving, 30);
        }
    }
    startObserving();

    console.log("[Antigravity i18n] Localization runner successfully initialized and active.");
})();
