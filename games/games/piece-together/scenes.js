/**
 * Piece Together pictures, drawn here so they work offline. Every picture is 300
 * by 300 and has something in each 100 by 100 square, so no two pieces look alike
 * (tests/picture-games-browser.cjs compares every pair of pieces at every level).
 *
 * Works in the browser (window.KlgPieceScenes) and in node tests (require).
 */
(function (root) {
  "use strict";

  const rect = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  const circle = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  const oval = (x, y, rx, ry, c) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
  const poly = (points, c) => `<polygon points="${points}" fill="${c}"/>`;
  const sun = (x, y) => circle(x, y, 30, "#ffb703") + circle(x, y, 20, "#ffd84d");
  const moon = (x, y) => circle(x, y, 26, "#fff3b0") + circle(x + 11, y - 6, 22, "#1d2b53");
  const cloud = (x, y) => circle(x - 20, y, 15, "#fff") + circle(x, y - 8, 20, "#fff") + circle(x + 22, y, 14, "#fff");
  const bird = (x, y) => `<path d="M${x - 14} ${y - 6}Q${x - 7} ${y - 12} ${x} ${y}Q${x + 7} ${y - 12} ${x + 14} ${y - 6}" fill="none" stroke="#33415c" stroke-width="4"/>`;
  const tree = (x, y) => rect(x - 7, y, 14, 42, "#7b4a25") + circle(x, y - 12, 28, "#3a9a4b");
  const pine = (x, y, c = "#1f7a4c") => rect(x - 5, y + 42, 10, 16, "#7b4a25") + poly(`${x},${y - 30} ${x + 24},${y + 44} ${x - 24},${y + 44}`, c);
  const flower = (x, y, c) => rect(x - 2, y, 4, 26, "#2c7a3f") + circle(x - 8, y, 7, c) + circle(x + 8, y, 7, c) + circle(x, y - 8, 7, c) + circle(x, y + 8, 7, c) + circle(x, y, 5, "#ffd84d");
  const star = (x, y, c = "#fff3b0") => poly(`${x},${y - 11} ${x + 3},${y - 3} ${x + 11},${y} ${x + 3},${y + 3} ${x},${y + 11} ${x - 3},${y + 3} ${x - 11},${y} ${x - 3},${y - 3}`, c);
  const fish = (x, y, c) => oval(x, y, 22, 13, c) + poly(`${x - 18},${y} ${x - 36},${y - 12} ${x - 36},${y + 12}`, c) + circle(x + 11, y - 3, 3, "#1b2733");
  const bubble = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff66" stroke="#fff" stroke-width="2"/>`;
  const weed = (x, y, c = "#2a9d6f") => `<path d="M${x} ${y}q-14 -18 0 -36q14 -18 0 -36" fill="none" stroke="${c}" stroke-width="7"/>`;
  const stripe = (x, y, w, h) => rect(x, y, w, h, "#ffffff");

  const SCENES = [
    { id: "boat", name: "a boat at sea", art: rect(0, 0, 300, 300, "#bfe8ff") + rect(0, 190, 300, 110, "#2f7fc1") + sun(48, 50) + cloud(150, 50) + bird(235, 35) + bird(270, 75)
      + oval(45, 192, 46, 34, "#79b857") + rect(38, 120, 8, 50, "#7b4a25") + circle(42, 118, 20, "#3a9a4b")
      + rect(146, 90, 7, 110, "#6b4a2b") + poly("155,95 205,180 155,180", "#fff") + poly("144,110 104,180 144,180", "#ff7b54") + poly("95,190 215,190 190,230 120,230", "#a4452c")
      + rect(236, 120, 30, 75, "#e4483c") + stripe(236, 140, 30, 14) + poly("232,120 270,120 251,98", "#33415c")
      + fish(55, 262, "#ffb703") + fish(160, 272, "#ff8fab") + fish(255, 248, "#f4f1de") + weed(290, 300) },
    { id: "house", name: "a house in a garden", art: rect(0, 0, 300, 300, "#cdeeff") + rect(0, 205, 300, 95, "#7ec850") + cloud(52, 45) + sun(252, 50) + poly("150,18 245,105 55,105", "#c8453b")
      + rect(75, 105, 150, 110, "#ffe1a8") + rect(130, 150, 42, 65, "#7b4a25") + rect(88, 125, 30, 30, "#7fd0ff") + rect(182, 125, 30, 30, "#7fd0ff") + rect(205, 25, 18, 50, "#8a5a44")
      + tree(30, 170) + tree(272, 170) + rect(140, 215, 22, 85, "#d9b382")
      + flower(45, 250, "#ff5d8f") + flower(95, 262, "#ffb703") + flower(205, 258, "#b15cff") + flower(258, 248, "#ff7b54") },
    { id: "rocket", name: "a rocket in space", art: rect(0, 0, 300, 300, "#1d2b53") + moon(52, 52) + star(150, 20) + star(255, 40) + star(215, 85, "#9fe7ff") + star(30, 150, "#9fe7ff") + star(95, 240)
      + circle(258, 245, 34, "#ff9f68") + `<ellipse cx="258" cy="245" rx="52" ry="11" fill="none" stroke="#ffe0b8" stroke-width="5"/>`
      + circle(48, 262, 20, "#6dd3a8") + circle(258, 160, 24, "#c9a0ff") + circle(250, 152, 6, "#a77de0") + circle(266, 170, 4, "#a77de0")
      + rect(30, 120, 34, 16, "#8d96a3") + rect(40, 110, 14, 36, "#dfe7ef") + rect(6, 122, 20, 12, "#3a6fd8") + rect(68, 122, 20, 12, "#3a6fd8")
      + oval(255, 80, 34, 22, "#ff5d8f") + oval(255, 80, 46, 7, "#ffd0e0")
      + poly("150,45 182,110 118,110", "#e4483c") + rect(118, 110, 64, 100, "#eef2f6") + circle(150, 145, 17, "#7fd0ff") + poly("118,160 88,225 118,210", "#e4483c") + poly("182,160 212,225 182,210", "#e4483c")
      + poly("128,210 172,210 150,280", "#ffb703") + poly("138,210 162,210 150,250", "#fff3b0") },
    { id: "reef", name: "fish under the sea", art: rect(0, 0, 300, 300, "#2788b8") + rect(0, 260, 300, 40, "#f0d9a0") + bubble(40, 30, 10) + bubble(68, 62, 7) + fish(170, 45, "#ffb703") + bubble(255, 40, 13) + bubble(232, 78, 7)
      + fish(70, 140, "#ff8fab") + oval(155, 150, 40, 24, "#ff7b54") + poly("120,150 88,128 88,172", "#ff7b54") + circle(178, 143, 5, "#1b2733") + rect(150, 128, 8, 44, "#fff") + fish(255, 120, "#9fe7ff") + bubble(215, 170, 8)
      + weed(30, 290) + weed(55, 290, "#3cbf7f") + circle(150, 270, 19, "#e4483c") + circle(138, 252, 6, "#e4483c") + circle(162, 252, 6, "#e4483c") + poly("235,288 290,288 262,235", "#c98bdb") + weed(215, 290, "#3cbf7f") },
    { id: "farm", name: "a barn on a farm", art: rect(0, 0, 300, 300, "#d6f1ff") + oval(150, 240, 240, 110, "#8cc152") + sun(50, 45) + bird(150, 30) + cloud(248, 55)
      + poly("95,75 205,75 225,130 75,130", "#8f2d2d") + rect(75, 130, 150, 100, "#c8453b") + rect(125, 165, 50, 65, "#fff") + rect(130, 170, 40, 60, "#8f2d2d") + poly("150,48 180,75 120,75", "#6d2020")
      + rect(10, 150, 8, 45, "#a3734a") + rect(38, 150, 8, 45, "#a3734a") + rect(0, 160, 70, 7, "#a3734a") + rect(0, 178, 70, 7, "#a3734a")
      + circle(262, 165, 28, "#f2c14e") + circle(240, 180, 20, "#e0ab30")
      + circle(50, 255, 16, "#ffe45e") + circle(62, 243, 10, "#ffe45e") + poly("70,241 82,245 70,249", "#ff7b54") + rect(142, 240, 16, 60, "#c9a06a") + flower(245, 250, "#ff5d8f") + flower(275, 262, "#fff") },
    { id: "camp", name: "a tent at night", art: rect(0, 0, 300, 300, "#1d2b53") + rect(0, 215, 300, 85, "#27633f") + moon(250, 50) + oval(45, 55, 42, 18, "#46598f") + oval(25, 42, 20, 14, "#46598f") + star(40, 18) + star(115, 60) + star(165, 25, "#9fe7ff") + star(195, 85)
      + pine(40, 140) + pine(265, 140, "#2c8c5a") + poly("150,100 235,225 65,225", "#ff9f1c") + poly("150,145 180,225 120,225", "#6b3a12") + rect(146, 100, 8, 8, "#fff")
      + rect(40, 262, 50, 10, "#7b4a25") + poly("50,262 66,225 80,262", "#ff7b54") + poly("58,262 66,240 74,262", "#ffd84d") + circle(150, 265, 12, "#a0a7b3") + circle(250, 255, 15, "#8d96a3") + rect(195, 270, 30, 8, "#7b4a25") },
    { id: "rainbow", name: "a rainbow over the hills", art: rect(0, 0, 300, 300, "#cdeeff") + `<g fill="none" stroke-width="14"><circle cx="150" cy="210" r="125" stroke="#e4483c"/><circle cx="150" cy="210" r="111" stroke="#ff9f1c"/><circle cx="150" cy="210" r="97" stroke="#ffd84d"/><circle cx="150" cy="210" r="83" stroke="#4cb963"/><circle cx="150" cy="210" r="69" stroke="#3a6fd8"/><circle cx="150" cy="210" r="55" stroke="#8a4fc7"/></g>`
      + cloud(30, 40) + bird(255, 35) + cloud(30, 195) + cloud(270, 195) + oval(70, 300, 130, 95, "#6dbb4f") + oval(240, 300, 120, 80, "#57a63d")
      + sun(150, 180) + flower(45, 255, "#ff5d8f") + flower(150, 265, "#ffb703") + tree(255, 240) },
    { id: "castle", name: "a castle with a flag", art: rect(0, 0, 300, 300, "#cfe8ff") + rect(0, 255, 300, 45, "#3a86c8") + cloud(48, 50) + rect(149, 20, 5, 60, "#33415c") + poly("154,22 195,36 154,50", "#e4483c") + sun(258, 48)
      + rect(30, 90, 60, 170, "#a9b4c2") + rect(210, 90, 60, 170, "#a9b4c2") + rect(90, 125, 120, 135, "#c2ccd8") + poly("24,90 96,90 60,50", "#5b4fa8") + poly("204,90 276,90 240,50", "#5b4fa8")
      + rect(115, 80, 70, 45, "#b6c0cd") + rect(115, 70, 14, 14, "#b6c0cd") + rect(143, 70, 14, 14, "#b6c0cd") + rect(171, 70, 14, 14, "#b6c0cd")
      + rect(50, 130, 20, 32, "#33415c") + rect(230, 130, 20, 32, "#33415c") + rect(125, 145, 50, 20, "#7fd0ff")
      + poly("120,260 120,205 150,185 180,205 180,260", "#6b3a12") + rect(115, 260, 70, 12, "#8a5a44") + fish(50, 280, "#ffb703") + fish(255, 282, "#ff8fab") },
    { id: "balloon", name: "a hot-air balloon", art: rect(0, 0, 300, 300, "#a8dcff") + oval(60, 300, 130, 70, "#6dbb4f") + oval(240, 300, 130, 90, "#57a63d") + cloud(45, 50) + bird(255, 40) + bird(225, 72)
      + circle(150, 95, 72, "#e4483c") + poly("150,23 178,28 170,165 130,165 122,28", "#ffd84d") + poly("150,23 158,24 154,167 146,167 142,24", "#3a6fd8")
      + rect(135, 195, 30, 28, "#8a5a44") + rect(132, 165, 3, 32, "#33415c") + rect(165, 165, 3, 32, "#33415c")
      + cloud(40, 150) + cloud(262, 160) + tree(45, 245) + rect(135, 262, 30, 26, "#ffe1a8") + poly("128,262 172,262 150,240", "#c8453b") + pine(255, 225) },
    { id: "train", name: "a train in the mountains", art: rect(0, 0, 300, 300, "#d6f1ff") + poly("0,190 75,55 150,190", "#8d96a3") + poly("55,92 75,55 95,92", "#fff") + poly("120,190 215,30 300,190", "#737d8c") + poly("190,72 215,30 240,72", "#fff") + sun(40, 40) + cloud(140, 40) + rect(0, 190, 300, 110, "#7ec850")
      + rect(0, 262, 300, 7, "#5a4632") + rect(25, 165, 65, 50, "#3a6fd8") + rect(32, 173, 20, 18, "#cdeeff") + rect(62, 173, 20, 18, "#cdeeff") + rect(105, 165, 65, 50, "#ffb703") + rect(112, 173, 20, 18, "#cdeeff") + rect(142, 173, 20, 18, "#cdeeff")
      + rect(185, 170, 70, 45, "#e4483c") + rect(235, 140, 30, 75, "#c8353a") + rect(193, 135, 16, 35, "#33415c") + circle(201, 118, 11, "#fff") + circle(190, 96, 15, "#fff") + rect(241, 150, 18, 18, "#cdeeff")
      + rect(25, 215, 230, 8, "#33415c") + circle(45, 240, 20, "#33415c") + circle(135, 240, 20, "#33415c") + circle(215, 240, 20, "#33415c") + flower(60, 280, "#ff5d8f") + flower(150, 282, "#fff") + flower(265, 262, "#ffb703") },
    { id: "beach", name: "a sunny beach", art: rect(0, 0, 300, 300, "#bfe8ff") + rect(0, 130, 300, 70, "#2f96c8") + rect(0, 200, 300, 100, "#f6dfa0") + sun(150, 50) + cloud(48, 55) + bird(262, 50) + rect(45, 90, 10, 125, "#8a5a44")
      + oval(25, 92, 34, 11, "#3a9a4b") + oval(75, 92, 34, 11, "#3a9a4b") + oval(50, 75, 11, 28, "#2c7a3f") + poly("150,120 200,165 100,165", "#fff") + rect(148, 165, 4, 25, "#fff") + `<path d="M220 165l45 -40l10 40z" fill="#ff7b54"/>` + rect(215, 165, 65, 12, "#a4452c")
      + rect(146, 205, 7, 65, "#33415c") + poly("149,190 215,235 85,235", "#e4483c") + circle(50, 262, 22, "#ffd84d") + rect(28, 258, 44, 8, "#3a6fd8") + oval(250, 262, 22, 14, "#e4483c") + circle(232, 246, 6, "#e4483c") + circle(268, 246, 6, "#e4483c") },
    { id: "snow", name: "a snowman in winter", art: rect(0, 0, 300, 300, "#27396b") + rect(0, 215, 300, 85, "#f1f6fb") + moon(50, 50) + star(150, 30, "#fff") + star(250, 50, "#fff") + star(115, 80, "#fff")
      + pine(45, 150) + rect(215, 135, 70, 70, "#a4452c") + poly("205,135 295,135 250,95", "#fff") + rect(240, 165, 22, 40, "#ffb703") + circle(150, 125, 26, "#fff") + rect(125, 88, 50, 10, "#1b2733") + rect(135, 60, 30, 30, "#1b2733")
      + circle(141, 120, 3, "#1b2733") + circle(159, 120, 3, "#1b2733") + poly("150,125 170,130 150,132", "#ff7b54") + circle(150, 190, 38, "#fff") + circle(150, 178, 4, "#1b2733") + circle(150, 196, 4, "#1b2733") + rect(125, 147, 50, 9, "#e4483c")
      + `<path d="M116 180L78 158M184 180L222 158" stroke="#7b4a25" stroke-width="5"/>` + circle(150, 256, 44, "#fff") + circle(50, 262, 16, "#d8e4f0") + pine(255, 235, "#2c8c5a") + circle(100, 240, 6, "#d8e4f0") + circle(215, 280, 8, "#d8e4f0") },
  ];

  /** One piece of a picture, or the whole picture when no piece is given. */
  function svg(scene, piece) {
    const box = piece ? `${(piece.col * 300) / piece.cols} ${(piece.row * 300) / piece.rows} ${300 / piece.cols} ${300 / piece.rows}` : "0 0 300 300";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" preserveAspectRatio="none" aria-hidden="true">${scene.art}</svg>`;
  }

  const api = { SCENES, svg };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.KlgPieceScenes = api;
})(typeof window !== "undefined" ? window : globalThis);
