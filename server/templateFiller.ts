import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import type { ParsedCourseData, CoPoPsoCell } from "./types.js";

export function fillCourseTemplate(
  data: ParsedCourseData,
  matrix: Record<string, Record<string, CoPoPsoCell | null>>,
  templateType: "integrated" | "non_lab",
  workflowStatus: string = "Draft"
): string {
  const templateFileName =
    templateType === "integrated"
      ? "integrated_lab.html"
      : templateType === "non_lab"
      ? "non_lab.html"
      : `${templateType}.html`;
  const templatePath = path.resolve(process.cwd(), "templates", templateFileName);

  let htmlContent = "";
  if (fs.existsSync(templatePath)) {
    htmlContent = fs.readFileSync(templatePath, "utf8");
  } else {
    htmlContent = `<!DOCTYPE html><html><head><title>${data.title}</title></head><body><h1>${data.title}</h1></body></html>`;
  }

  const $ = cheerio.load(htmlContent);

  // Set document title
  $("title").text(`Course Specifications - ${data.code} ${data.title}`);

  // Table 1: Metadata
  $("table").eq(0).find("tr").each((_, tr) => {
    const label = $(tr).find("td.static, td:first-child").text().trim().toLowerCase();
    const valCell = $(tr).find("td[contenteditable], td:nth-child(2)");
    if (label.includes("course title")) valCell.text(data.title);
    else if (label.includes("course code")) valCell.text(data.code);
    else if (label.includes("course type")) valCell.text(data.course_type);
    else if (label.includes("department")) valCell.text(data.department);
    else if (label.includes("faculty")) valCell.text(data.faculty);
    else if (label.includes("course summary")) valCell.text(data.summary);
  });

  // Table 2: Credits and Hours
  $("table").eq(1).find("tr").each((_, tr) => {
    const label = $(tr).find("td.static, td:first-child").text().trim().toLowerCase();
    const valCell = $(tr).find("td[contenteditable], td:nth-child(2)");
    if (label.includes("number of credits")) valCell.text(String(data.total_credits).padStart(2, "0"));
    else if (label.includes("credit structure")) valCell.text(data.credits_ltp);
    else if (label.includes("total hours")) valCell.text(String(data.total_hours));
    else if (label.includes("department responsible")) valCell.text(data.department);
  });

  // Section 3: Course Outcomes
  // Replace the placeholder CO list in the document
  const coListHtml = data.course_outcomes
    .map(
      (c) =>
        `<li style="margin-bottom: 6px;"><strong>${c.id}.</strong> ${c.statement} <span style="font-size: 11px; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Bloom: L${c.bloom_level}</span></li>`
    )
    .join("");

  const coContainer = $("h3:contains('Course Outcomes'), h2:contains('Course Outcomes')").parent();
  if (coContainer.find("ol, ul").length > 0) {
    coContainer.find("ol, ul").first().html(coListHtml);
  }

  // Table 3: Mapping Matrix (CO-PO-PSO)
  const mapTable = $("table").eq(2);
  // Keep first 2 header rows
  mapTable.find("tr:gt(1)").remove();

  for (const co of data.course_outcomes) {
    const rowData = matrix[co.id] || {};
    let cells = `<td style="font-weight: bold; padding: 6px; text-align: center;">${co.id}</td>`;

    // PO-1 to PO-11
    for (let i = 1; i <= 11; i++) {
      const val = rowData[`PO-${i}`]?.level || "";
      const bg = val === 3 ? "#bbf7d0" : val === 2 ? "#ccfbf1" : val === 1 ? "#e0f2fe" : "transparent";
      cells += `<td style="text-align: center; padding: 4px; background-color: ${bg}; font-weight: ${val ? 'bold' : 'normal'};">${val}</td>`;
    }

    // PSO-1 and PSO-2
    for (let j = 1; j <= 2; j++) {
      const val = rowData[`PSO-${j}`]?.level || "";
      const bg = val === 3 ? "#bbf7d0" : val === 2 ? "#ccfbf1" : val === 1 ? "#e0f2fe" : "transparent";
      cells += `<td style="text-align: center; padding: 4px; background-color: ${bg}; font-weight: ${val ? 'bold' : 'normal'};">${val}</td>`;
    }

    mapTable.append(`<tr>${cells}</tr>`);
  }

  // Section 4: Course Contents
  const unitsHtml = data.units
    .map(
      (u) => `
    <div style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
      <h4 style="margin: 0 0 6px 0; color: #1e293b; font-size: 14px;">Unit ${u.number} (${u.title}) ${u.hours ? `<span style="font-size: 12px; color: #64748b; font-weight: normal;">- ${u.hours} Hours</span>` : ""}</h4>
      <p style="margin: 0 0 6px 0; font-size: 13px; line-height: 1.5; color: #334155;">${u.content || ""}</p>
      ${u.lab ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #4338ca; background: #eef2ff; padding: 4px 8px; border-radius: 4px;"><strong>Lab Exercises:</strong> ${u.lab}</p>` : ""}
    </div>`
    )
    .join("");

  const unitHeading = $("h3:contains('Course Contents'), h2:contains('Course Contents')");
  if (unitHeading.length > 0) {
    const parent = unitHeading.parent();
    // Replace unit placeholders
    parent.find(".unit-container, div:has(h4)").remove();
    unitHeading.after(`<div class="unit-container" style="margin-top: 12px;">${unitsHtml}</div>`);
  }

  // Table 4: Teaching hours
  $("table").eq(3).find("tr").each((_, tr) => {
    const text = $(tr).text().toLowerCase();
    if (text.includes("face to face lectures")) {
      $(tr).find("td:last-child").text(String(data.teaching_hours.lectures || 45));
    } else if (text.includes("practical") || text.includes("laboratory")) {
      $(tr).find("td:last-child").text(String(data.teaching_hours.lab || 30));
    } else if (text.includes("total duration in hours")) {
      $(tr).find("td:last-child").text(String(data.teaching_hours.total || 75));
    }
  });

  // Table 5: Assessment Table
  const assessTable = $("table.assessment-integrated-table, table:has(th:contains('Focus of COs'))").first();
  if (!assessTable || assessTable.length === 0) {
    throw new Error("Assessment table not found in template.");
  }

  if (!data.assessment.components || data.assessment.components.length === 0) {
    const thead = assessTable.find("thead");
    const tbody = assessTable.find("tbody");
    const emptyRow = `<tr><td colspan="10" style="text-align: center; padding: 12px; color: #dc2626; font-style: italic;">Assessment components unresolved in source document</td></tr>`;
    if (tbody.length > 0) {
      tbody.html(emptyRow);
    } else {
      assessTable.find("tr:gt(0)").remove();
      assessTable.append(emptyRow);
    }
  } else {
    const compHeaders = data.assessment.components
      .map((c) => `<th class="static text-center" style="font-weight: bold; padding: 6px;">${c.name}<br>(${c.weight_percent}%)</th>`)
      .join("");

    const theadHtml = `
      <tr>
        <th class="static text-center" colspan="${data.assessment.components.length + 1}">Focus of COs on each Component or Subcomponent of Evaluation</th>
      </tr>
      <tr>
        <th class="static text-center" style="vertical-align: middle; font-weight: bold; padding: 6px;">Course Outcome</th>
        ${compHeaders}
      </tr>
    `;

    const rowsHtml = data.course_outcomes
      .map((co) => {
        const coverage = data.assessment.co_coverage[co.id] || [];
        const cells = data.assessment.components
          .map((c) => {
            const isCovered = coverage.includes(c.name);
            return `<td class="text-center" contenteditable="true" style="padding: 4px;">${isCovered ? "X" : ""}</td>`;
          })
          .join("");
        return `
          <tr>
            <td class="static text-center" style="font-weight: bold; text-align: center; padding: 6px;">${co.id}</td>
            ${cells}
          </tr>
        `;
      })
      .join("");

    const thead = assessTable.find("thead");
    const tbody = assessTable.find("tbody");
    if (thead.length > 0 && tbody.length > 0) {
      thead.html(theadHtml);
      tbody.html(rowsHtml);
    } else {
      assessTable.empty().append(`<thead>${theadHtml}</thead><tbody>${rowsHtml}</tbody>`);
    }
  }

  // Watermark management:
  // Show prominent DRAFT watermark unless status is 'Approved'
  $(".specforge-watermark").remove();
  if (workflowStatus !== "Approved") {
    $("body").prepend(`
      <div class="specforge-watermark" style="
        position: fixed;
        top: 40%;
        left: 20%;
        transform: rotate(-35deg);
        font-size: 110px;
        font-weight: 900;
        color: rgba(220, 38, 38, 0.12);
        letter-spacing: 14px;
        pointer-events: none;
        z-index: 9999;
        user-select: none;
        text-transform: uppercase;
      ">DRAFT</div>
    `);
  }

  // Remove any remaining template dummy course names
  let rendered = $.html();
  rendered = rendered.replace(/Computer Vision/g, data.title);
  rendered = rendered.replace(/AIC304A/g, data.code);
  rendered = rendered.replace(/AIML/g, data.department);

  return rendered;
}
