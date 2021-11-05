/**
 * @ignore
 * @packageDocumentation
 * @preferred
 */

import { strings } from "./strings";

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
fetch("data/THIRD_PARTY.json")
  .then((res) => res.json())
  .then(
    (
      data: {
        name: string;
        version: string;
        authors: string;
        url: string;
        license: string;
      }[]
    ) => {
      const creditsEle = document.getElementById("credits");
      const creditsFrag = document.createDocumentFragment();
      data.forEach((item) => {
        const ele = createElement("div", { class: "credit " });
        ele.appendChild(createElement("h3", {}, item.name));
        ele.appendChild(createElement("p", { class: "authors" }, item.authors));
        ele.appendChild(
          createElement(
            "p",
            { class: "description" },
            strings.about.version(item.version, item.url)
          )
        );

        const licenseContainer = createElement("p", { class: "description" });
        const link = createElement("a", { href: "#" }, strings.about.license);
        link.onclick = () => {
          licenseContainer.appendChild(
            createElement("pre", { class: "license" }, item.license)
          );
          licenseContainer.removeChild(link);
        };

        licenseContainer.appendChild(link);
        ele.appendChild(licenseContainer);

        creditsFrag.appendChild(ele);
      });
      creditsEle.appendChild(creditsFrag);
    }
  );

document.getElementById("version").innerText = CHARTICULATOR_PACKAGE.version;
document.getElementById("revision").innerText = CHARTICULATOR_PACKAGE.revision;

/**
 * @ignore
 */
function createElement(name: string, attrs: any, text?: string) {
  const ele = document.createElement(name);
  Object.keys(attrs).forEach((attr) => {
    const attrValue = attrs[attr];
    ele.setAttribute(attr, attrValue);
  });
  if (text) {
    ele.textContent = text;
  }
  return ele;
}
/**
 * @ignore
 */
((d) => {
  const wf = d.createElement("script"),
    s = d.scripts[0];
  wf.src = "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js";
  wf.async = true;
  s.parentNode.insertBefore(wf, s);
})(document);
