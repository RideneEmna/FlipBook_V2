/* ── Flipbook Studio Pro: FBEngine & Page Simulator Engine ───────── */
// FBEngine for Simulator Mode

    const FBEngine = (function() {

      let scorePanel = null;

      function normalize(str, caseSensitive) {

        const s = str.trim().replace(/\s+/g, ' ');

        return caseSensitive ? s : s.toLowerCase();

      }

      function checkOne(inp) {

        if (!inp) return false;

        const answer   = inp.dataset.answer || '';

        const alts     = (inp.dataset.alt || '').split(';').map(s => s.trim()).filter(Boolean);

        const cs       = inp.dataset.caseSensitive === '1';

        const userVal  = normalize(inp.value, cs);

        const expected = [normalize(answer, cs), ...alts.map(a => normalize(a, cs))];

        const ok       = expected.includes(userVal);

        inp.classList.remove('correct', 'incorrect');

        void inp.offsetWidth;

        inp.classList.add(ok ? 'correct' : 'incorrect');

        if (ok) inp.readOnly = true;

        return ok;

      }

      function validateGroup(groupId) {

        const inputs = Array.from(document.querySelectorAll('.fill-input'))

          .filter(inp => !groupId || inp.dataset.groupId === groupId);

        let correct = 0;

        inputs.forEach(inp => { if (checkOne(inp)) correct++; });

        const checkboxes = Array.from(document.querySelectorAll('.widget-checkbox'))

          .filter(cb => !groupId || cb.dataset.groupId === groupId);

        checkboxes.forEach(cb => {

          const isChecked = cb.dataset.checked === '1';

          const isCorrect = cb.dataset.correct === '1';

          const ok = isChecked === isCorrect;

          cb.classList.remove('validated-correct', 'validated-wrong');

          cb.classList.add(ok ? 'validated-correct' : 'validated-wrong');

          if (ok) correct++;

        });

        showScore(correct, inputs.length + checkboxes.length);

      }

      function revealAnswers(groupId) {

        document.querySelectorAll('.fill-input').forEach(inp => {

          if (!groupId || inp.dataset.groupId === groupId) {

            inp.value = inp.dataset.answer;

            inp.classList.remove('incorrect'); inp.classList.add('correct');

            inp.readOnly = true;

          }

        });

        document.querySelectorAll('.widget-checkbox').forEach(cb => {

          if (!groupId || cb.dataset.groupId === groupId) {

            const isCorrect = cb.dataset.correct === '1';

            cb.dataset.checked = isCorrect ? '1' : '0';

            const box = cb.querySelector('.chk-box');

            if (box) { box.textContent = isCorrect ? '\u2713' : ''; box.classList.toggle('checked', isCorrect); }

            cb.classList.add('validated-correct');

          }

        });

      }

      function resetGroup(groupId) {

        document.querySelectorAll('.fill-input').forEach(inp => {

          if (!groupId || inp.dataset.groupId === groupId) {

            inp.value = ''; inp.classList.remove('correct','incorrect'); inp.readOnly = false;

          }

        });

        document.querySelectorAll('.widget-checkbox').forEach(cb => {

          if (!groupId || cb.dataset.groupId === groupId) {

            cb.dataset.checked = '0';

            const box = cb.querySelector('.chk-box');

            if (box) { box.textContent = ''; box.classList.remove('checked'); }

            cb.classList.remove('validated-correct','validated-wrong');

          }

        });

        if (scorePanel) { scorePanel.remove(); scorePanel = null; }

      }

      const LOTTIE_SUCCESS_DATA = {"v":"5.7.1","fr":30,"ip":0,"op":60,"w":300,"h":300,"nm":"Comp 1","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"4","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[151,151,0],"ix":2},"a":{"a":0,"k":[0,0,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[-22.5,-7.5],[0,0]],"o":[[0,0],[22.5,7.5],[0,0]],"v":[[61,78.5],[78,100.5],[94,115.5]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.11764705882352941,0.3215686274509804,0.7803921568627451,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":5,"ix":5},"lc":2,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":28.254,"s":[0]},{"t":51,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":17,"s":[0]},{"t":46.2109375,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false}],"ip":17,"op":617,"st":17,"bm":0},{"ddd":0,"ind":2,"ty":4,"nm":"3","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":203,"ix":10},"p":{"a":0,"k":[251.408,59.449,0],"ix":2},"a":{"a":0,"k":[-103.936,89.696,0],"ix":1},"s":{"a":0,"k":[91.456,89.381,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[29.459,25.084],[5,-25.75],[5.75,-0.75]],"o":[[0,0],[-25.25,-21.5],[-5.515,28.405],[-5.75,0.75]],"v":[[-75,68.75],[-107.25,86.5],[-94,84],[-128.75,113]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.9882352941176471,0.7254901960784313,0.2235294117647059,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":5,"ix":5},"lc":2,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":28.254,"s":[0]},{"t":51,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":17,"s":[0]},{"t":46.2109375,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false}],"ip":17,"op":617,"st":17,"bm":0},{"ddd":0,"ind":3,"ty":4,"nm":"2","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[-21,347,0],"ix":2},"a":{"a":0,"k":[0,0,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[20.5,4.5],[0,0],[18.25,9.25],[3.5,-3.25]],"o":[[0,0],[-20.5,-4.5],[0,0],[-18.25,-9.25],[-3.5,3.25]],"v":[[90.75,-122.25],[83.5,-110.5],[81.25,-97.25],[69.75,-93.25],[61,-75.75]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.6,0.09019607843137255,0.9254901960784314,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":5,"ix":5},"lc":2,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":28.254,"s":[0]},{"t":51,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":17,"s":[0]},{"t":46.2109375,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false}],"ip":17,"op":617,"st":17,"bm":0},{"ddd":0,"ind":4,"ty":4,"nm":"1","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[147,146,0],"ix":2},"a":{"a":0,"k":[0,0,0],"ix":1},"s":{"a":0,"k":[109.756,101.856,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[33.75,1]],"o":[[0,0],[-33.75,-1]],"v":[[-57.75,-75.75],[-90.75,-107.5]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"st","c":{"a":0,"k":[0.9921568627450981,0.3686274509803922,0.4588235294117647,1],"ix":3},"o":{"a":0,"k":100,"ix":4},"w":{"a":0,"k":5,"ix":5},"lc":2,"lj":1,"ml":4,"bm":0,"nm":"Stroke 1","mn":"ADBE Vector Graphic - Stroke","hd":false},{"ty":"tr","p":{"a":0,"k":[-1.5,-0.25],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Shape 1","np":3,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":28.254,"s":[0]},{"t":51,"s":[100]}],"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":17,"s":[0]},{"t":46.2109375,"s":[100]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"nm":"Trim Paths 1","mn":"ADBE Vector Filter - Trim","hd":false}],"ip":17,"op":617,"st":17,"bm":0},{"ddd":0,"ind":5,"ty":4,"nm":"checkmark/success Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[150.06,150.061,0],"ix":2},"a":{"a":0,"k":[99,99,0],"ix":1},"s":{"a":1,"k":[{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":0,"s":[100,100,100]},{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.333,0.333,0.333],"y":[0,0,0]},"t":12,"s":[27,27,100]},{"t":21,"s":[100,100,100]}],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0.831,1.409],[0,0],[-0.622,2.004],[-1.844,1.043],[-2.083,-0.474],[-1.215,-1.74],[0,0],[-0.949,0.537],[0,0],[-2.041,-0.632],[-1.075,-1.826],[0.463,-2.047],[1.756,-1.181]],"o":[[-1.424,0.805],[0,0],[-0.93,-1.899],[0.622,-2.006],[1.844,-1.042],[2.084,0.474],[0,0],[0.553,0.939],[0,0],[1.921,-0.899],[2.042,0.631],[1.076,1.823],[-0.463,2.047],[0,0]],"v":[[-26.138,30.587],[-30.199,29.498],[-58.899,-19.189],[-59.378,-25.261],[-55.542,-30.001],[-49.433,-30.884],[-44.302,-27.441],[-23.618,7.647],[-20.911,8.371],[47.571,-30.344],[53.736,-30.76],[58.584,-26.94],[59.537,-20.918],[56.086,-15.898]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[99.943,103.024],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[83.631,83.631],"ix":3},"r":{"a":0,"k":-12.6,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-47.479,-12.722],[12.721,-47.478],[47.478,12.722],[-12.723,47.478]],"o":[[47.479,12.722],[-12.723,47.479],[-47.478,-12.723],[12.721,-47.479]],"v":[[23.036,-85.967],[85.969,23.035],[-23.035,85.967],[-85.966,-23.035]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":0,"s":[0.901960790157,0.901960790157,0.901960790157,1]},{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":10,"s":[0.901960790157,0.901960790157,0.901960790157,1]},{"t":29,"s":[0.262745112181,0.823529422283,0.588235318661,1]}],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[98.939,98.939],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 2","np":2,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":600,"st":0,"bm":0},{"ddd":0,"ind":6,"ty":4,"nm":"large-circles/success Outlines","sr":1,"ks":{"o":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":42,"s":[100]},{"t":52,"s":[2]}],"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[148,146,0],"ix":2},"a":{"a":0,"k":[95.5,98,0],"ix":1},"s":{"a":1,"k":[{"i":{"x":[0.667,0.667,0.667],"y":[1,1,1]},"o":{"x":[0.009,0.009,0.333],"y":[1.621,1.621,0]},"t":17,"s":[62,62,100]},{"t":50,"s":[124,124,100]}],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-6.209,1.338],[-1.337,-6.209],[6.209,-1.337],[1.338,6.209]],"o":[[6.208,-1.337],[1.338,6.209],[-6.209,1.338],[-1.337,-6.209]],"v":[[-2.421,-11.243],[11.242,-2.422],[2.421,11.241],[-11.243,2.421]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.6,0.09019607843137255,0.9254901960784314,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[173.998,145.423],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[71,71],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-6.209,1.337],[-1.338,-6.209],[6.209,-1.338],[1.338,6.209]],"o":[[6.209,-1.338],[1.337,6.209],[-6.209,1.337],[-1.337,-6.208]],"v":[[-2.421,-11.242],[11.242,-2.422],[2.422,11.242],[-11.243,2.422]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.11764705882352941,0.3215686274509804,0.7803921568627451,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[63.997,183.011],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[70,70],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 2","np":2,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-6.209,1.337],[-1.337,-6.208],[6.209,-1.337],[1.338,6.209]],"o":[[6.209,-1.337],[1.338,6.209],[-6.209,1.338],[-1.337,-6.209]],"v":[[-2.421,-11.243],[11.242,-2.423],[2.421,11.242],[-11.243,2.421]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.9882352941176471,0.7254901960784313,0.2235294117647059,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[103.291,12.83],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[70,70],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 3","np":2,"cix":2,"bm":0,"ix":3,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-6.208,1.337],[-1.337,-6.209],[6.209,-1.338],[1.338,6.209]],"o":[[6.209,-1.337],[1.338,6.209],[-6.209,1.337],[-1.337,-6.209]],"v":[[-2.423,-11.242],[11.241,-2.422],[2.421,11.242],[-11.243,2.422]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.11764705882352941,0.3215686274509804,0.7803921568627451,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[178.004,59.795],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[67,67],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 4","np":2,"cix":2,"bm":0,"ix":4,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-6.209,1.337],[-1.338,-6.208],[6.209,-1.337],[1.338,6.209]],"o":[[6.209,-1.337],[1.337,6.209],[-6.209,1.338],[-1.337,-6.209]],"v":[[-2.421,-11.243],[11.243,-2.423],[2.422,11.242],[-11.243,2.421]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0.9921568627450981,0.3686274509803922,0.4588235294117647,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[12.829,84.352],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[68,68],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 5","np":2,"cix":2,"bm":0,"ix":5,"mn":"ADBE Vector Group","hd":false}],"ip":17,"op":617,"st":17,"bm":0},{"ddd":0,"ind":7,"ty":4,"nm":"checkmark/success Outlines","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[150.073,150.073,0],"ix":2},"a":{"a":0,"k":[99,99,0],"ix":1},"s":{"a":1,"k":[{"i":{"x":[0.203,0.203,0.667],"y":[0.507,0.507,1]},"o":{"x":[0.915,0.915,0.333],"y":[0.651,0.651,0]},"t":50,"s":[93.357,93.357,100]},{"t":59,"s":[121.357,121.357,100]}],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0.831,1.409],[0,0],[-0.622,2.004],[-1.844,1.043],[-2.083,-0.474],[-1.215,-1.74],[0,0],[-0.949,0.537],[0,0],[-2.041,-0.632],[-1.075,-1.826],[0.463,-2.047],[1.756,-1.181]],"o":[[-1.424,0.805],[0,0],[-0.93,-1.899],[0.622,-2.006],[1.844,-1.042],[2.084,0.474],[0,0],[0.553,0.939],[0,0],[1.921,-0.899],[2.042,0.631],[1.076,1.823],[-0.463,2.047],[0,0]],"v":[[-26.138,30.587],[-30.199,29.498],[-58.899,-19.189],[-59.378,-25.261],[-55.542,-30.001],[-49.433,-30.884],[-44.302,-27.441],[-23.618,7.647],[-20.911,8.371],[47.571,-30.344],[53.736,-30.76],[58.584,-26.94],[59.537,-20.918],[56.086,-15.898]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[1,1,1,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[98.943,102.024],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":2,"cix":2,"bm":0,"ix":1,"mn":"ADBE Vector Group","hd":false},{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[-47.479,-12.722],[12.721,-47.478],[47.478,12.722],[-12.723,47.478]],"o":[[47.479,12.722],[-12.723,47.479],[-47.478,-12.723],[12.721,-47.479]],"v":[[23.036,-85.967],[85.969,23.035],[-23.035,85.967],[-85.966,-23.035]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","c":{"a":0,"k":[0,0.8549019607843137,0.5607843137254902,1],"ix":4},"o":{"a":0,"k":100,"ix":5},"r":1,"bm":0,"nm":"Fill 1","mn":"ADBE Vector Graphic - Fill","hd":false},{"ty":"tr","p":{"a":0,"k":[98.939,98.939],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 2","np":2,"cix":2,"bm":0,"ix":2,"mn":"ADBE Vector Group","hd":false}],"ip":50,"op":650,"st":50,"bm":0}],"markers":[]};

      function playCelebrationChime() {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.11);
            gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.11);
            gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + idx * 0.11 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.11 + 0.38);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.11);
            osc.stop(ctx.currentTime + idx * 0.11 + 0.4);
          });
        } catch(e) {}
      }

      function playLottieSuccess() {
        const containerId = 'lottie-success-container';
        let c = document.getElementById(containerId);
        if (!c) {
          c = document.createElement('div');
          c.id = containerId;
          c.style.position = 'fixed';
          c.style.inset = '0';
          c.style.pointerEvents = 'none';
          c.style.zIndex = '10010';
          c.style.display = 'flex';
          c.style.alignItems = 'center';
          c.style.justifyContent = 'center';
          document.body.appendChild(c);
        }
        c.innerHTML = '<div id="lottie-success-anim" style="width: 420px; height: 420px; filter: drop-shadow(0 12px 28px rgba(0,0,0,0.6));"></div>';

        playCelebrationChime();

        if (window.lottie && typeof LOTTIE_SUCCESS_DATA !== 'undefined') {
          try {
            window.lottie.loadAnimation({
              container: document.getElementById('lottie-success-anim'),
              renderer: 'svg',
              loop: false,
              autoplay: true,
              animationData: LOTTIE_SUCCESS_DATA
            });
            setTimeout(() => { if (c) c.innerHTML = ''; }, 3500);
            return;
          } catch(err) {
            console.error('Lottie inline error', err);
          }
        }

        fetch('/api/media-preview?path=assets/lottie-success.json')
          .then(res => res.json())
          .then(data => {
            if (window.lottie) {
              window.lottie.loadAnimation({
                container: document.getElementById('lottie-success-anim'),
                renderer: 'svg',
                loop: false,
                autoplay: true,
                animationData: data
              });
            }
            setTimeout(() => { if (c) c.innerHTML = ''; }, 3500);
          })
          .catch(err => console.error('Lottie fetch fail', err));
      }

      function showScore(correct, total) {

        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

        if (!scorePanel) {

          scorePanel = document.createElement('div');

          scorePanel.className = 'score-panel';

          const container = document.getElementById('sim-overlay');

          if (container) container.appendChild(scorePanel);

          else document.body.appendChild(scorePanel);

        }

        const star = pct === 100 ? ' \u2b50' : '';

        if (pct === 100 && total > 0) {

          playLottieSuccess();

        }

        scorePanel.innerHTML =

          '<h4>\ud83d\udcca Score de la page</h4>' +

          '<span class="score-num">' + correct + ' / ' + total + star + '</span>' +

          '<span class="score-sub">' + pct + '% de bonnes reponses</span>' +

          '<div class="score-bar-wrap"><div class="score-bar" style="width:' + pct + '%"></div></div>' +

          '<div class="score-btns">' +

            '<button class="score-btn validate-btn" onclick="window.FBEngine.validateGroup(\'\')">Corriger</button>' +

            '<button class="score-btn" onclick="window.FBEngine.revealAnswers(\'\')">Reponses</button>' +

            '<button class="score-btn" onclick="window.FBEngine.resetGroup(\'\')">Refaire</button>' +

          '</div>';

      }

      return { checkOne, validateGroup, revealAnswers, resetGroup, showScore };

    })();

    window.FBEngine = FBEngine;


// ══════════════════════════════════════════════════════════

    // INTERACTIVE LIVE PAGE SIMULATOR

    // ══════════════════════════════════════════════════════════

    let simSpeechUtterance = null;

    let simAudioElement = null;

    let simAmbientAudio = null;

    let simIsAmbientPlaying = false;

    let simActiveTtsId = null;

    let simActiveAudioId = null;

    // ── SIMULATOR ANNOTATION & LOUPE ENGINE ──

    let simActiveTool = null; // 'pen', 'eraser', 'loupe', null

    let simAnnotColor = '#0ea5e9';

    let simAnnotSize = 2.5;

    const simPageDrawingsCache = {}; // pageNum -> dataURL

    let isSimDrawing = false;

    function toggleSimTool(tool) {

      if (simActiveTool === tool) {

        simActiveTool = null;

      } else {

        simActiveTool = tool;

      }

      applySimToolState();

    }

    function setSimAnnotColor(color, el, overrideSize) {

      simAnnotColor = color;

      if (overrideSize) simAnnotSize = overrideSize;

      document.querySelectorAll('#sim-annot-palette .color-dot').forEach(d => d.classList.remove('active'));

      if (el) el.classList.add('active');

    }

    function setSimAnnotSize(size, el) {

      simAnnotSize = size;

      document.querySelectorAll('#sim-annot-palette .size-dot').forEach(d => d.classList.remove('active'));

      if (el) el.classList.add('active');

    }

    function clearSimCurrentPageDrawing() {

      const canvas = document.getElementById('sim-annot-canvas');

      if (!canvas) return;

      const ctx = canvas.getContext('2d');

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pageNum = currentPageIndex + 1;

      delete simPageDrawingsCache[pageNum];

    }

    function applySimToolState() {

      document.body.classList.remove('sim-annot-mode-pen', 'sim-annot-mode-eraser', 'sim-annot-mode-loupe');

      ['sim-btn-pen', 'sim-btn-eraser', 'sim-btn-loupe'].forEach(id => {

        const btn = document.getElementById(id);

        if (btn) btn.classList.remove('btn-tool-active');

      });

      const palette = document.getElementById('sim-annot-palette');

      const lens = document.getElementById('sim-loupe-lens');

      if (lens) lens.style.display = 'none';

      if (simActiveTool === 'pen') {

        document.body.classList.add('sim-annot-mode-pen');

        const b = document.getElementById('sim-btn-pen');

        if (b) b.classList.add('btn-tool-active');

        if (palette) palette.style.display = 'flex';

        setupSimAnnotCanvas();

      } else if (simActiveTool === 'eraser') {

        document.body.classList.add('sim-annot-mode-eraser');

        const b = document.getElementById('sim-btn-eraser');

        if (b) b.classList.add('btn-tool-active');

        if (palette) palette.style.display = 'flex';

        setupSimAnnotCanvas();

      } else if (simActiveTool === 'loupe') {

        document.body.classList.add('sim-annot-mode-loupe');

        const b = document.getElementById('sim-btn-loupe');

        if (b) b.classList.add('btn-tool-active');

        if (palette) palette.style.display = 'none';

      } else {

        if (palette) palette.style.display = 'none';

      }

    }

    function setupSimAnnotCanvas() {

      const canvas = document.getElementById('sim-annot-canvas');

      const bookPage = document.getElementById('sim-book-page');

      if (!canvas || !bookPage) return;

      const rect = bookPage.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {

        const dpr = window.devicePixelRatio || 1;

        const targetW = Math.round(rect.width * dpr);

        const targetH = Math.round(rect.height * dpr);

        if (canvas.width !== targetW || canvas.height !== targetH) {

          const pageNum = currentPageIndex + 1;

          const prevData = simPageDrawingsCache[pageNum];

          canvas.width = targetW;

          canvas.height = targetH;

          if (prevData) {

            const img = new Image();

            img.onload = () => {

              const ctx = canvas.getContext('2d');

              ctx.drawImage(img, 0, 0, targetW, targetH);

            };

            img.src = prevData;

          }

        }

      }

      if (!canvas.getAttribute('data-initialized')) {

        canvas.setAttribute('data-initialized', 'true');

        initSimCanvasListeners(canvas);

      }

    }

    function initSimCanvasListeners(canvas) {

      const ctx = canvas.getContext('2d');

      function getCoords(e) {

        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;

        const scaleY = canvas.height / rect.height;

        return {

          x: (e.clientX - rect.left) * scaleX,

          y: (e.clientY - rect.top) * scaleY,

          scaleRatio: scaleX

        };

      }

      canvas.addEventListener('pointerdown', (e) => {

        if (simActiveTool !== 'pen' && simActiveTool !== 'eraser') return;

        e.preventDefault();

        e.stopPropagation();

        try { canvas.setPointerCapture(e.pointerId); } catch(err) {}

        isSimDrawing = true;

        const { x, y, scaleRatio } = getCoords(e);

        if (simActiveTool === 'pen') {

          ctx.globalCompositeOperation = 'source-over';

          ctx.strokeStyle = simAnnotColor;

          ctx.lineWidth = simAnnotSize * scaleRatio;

          ctx.lineCap = 'round';

          ctx.lineJoin = 'round';

          ctx.beginPath();

          ctx.moveTo(x, y);

          ctx.lineTo(x, y);

          ctx.stroke();

        } else if (simActiveTool === 'eraser') {

          ctx.globalCompositeOperation = 'destination-out';

          ctx.beginPath();

          ctx.arc(x, y, 16 * scaleRatio, 0, Math.PI * 2);

          ctx.fill();

        }

      });

      canvas.addEventListener('pointermove', (e) => {

        if (!isSimDrawing) return;

        e.preventDefault();

        e.stopPropagation();

        const { x, y, scaleRatio } = getCoords(e);

        if (simActiveTool === 'pen') {

          ctx.lineTo(x, y);

          ctx.stroke();

        } else if (simActiveTool === 'eraser') {

          ctx.beginPath();

          ctx.arc(x, y, 16 * scaleRatio, 0, Math.PI * 2);

          ctx.fill();

        }

      });

      const finishDrawing = (e) => {

        if (!isSimDrawing) return;

        isSimDrawing = false;

        const pageNum = currentPageIndex + 1;

        simPageDrawingsCache[pageNum] = canvas.toDataURL();

      };

      canvas.addEventListener('pointerup', finishDrawing);

      canvas.addEventListener('pointercancel', finishDrawing);

    }

    // Simulator Loupe Tracking

    (function initSimLoupe() {

      window.addEventListener('mousemove', (e) => {

        const lens = document.getElementById('sim-loupe-lens');

        const simImg = document.getElementById('sim-page-img');

        if (!lens || !simImg) return;

        if (simActiveTool !== 'loupe') {

          lens.style.display = 'none';

          return;

        }

        const modal = document.getElementById('page-simulator-modal');

        if (!modal || !modal.classList.contains('open')) {

          lens.style.display = 'none';

          return;

        }

        const rect = simImg.getBoundingClientRect();

        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {

          lens.style.display = 'none';

          return;

        }

        lens.style.display = 'block';

        lens.style.left = e.clientX + 'px';

        lens.style.top = e.clientY + 'px';

        const zoomFactor = 2.4;

        const relX = (e.clientX - rect.left) / rect.width;

        const relY = (e.clientY - rect.top) / rect.height;

        const bgW = rect.width * zoomFactor;

        const bgH = rect.height * zoomFactor;

        const bgX = -(relX * bgW - 90);

        const bgY = -(relY * bgH - 90);

        lens.style.backgroundImage = `url("${simImg.src}")`;

        lens.style.backgroundSize = `${bgW}px ${bgH}px`;

        lens.style.backgroundPosition = `${bgX}px ${bgY}px`;

      });

    })();

    function openPageLivePreview() {

      if (!currentPdfPath || totalPages === 0) {

        showError("Veuillez charger un document PDF.");

        return;

      }

      stopSimAllAudio();

      const modal = document.getElementById('page-simulator-modal');

      modal.classList.add('open');

      renderSimulatorPage();

    }

    function closePageLivePreview() {

      stopSimAllAudio();

      simActiveTool = null;

      applySimToolState();

      const modal = document.getElementById('page-simulator-modal');

      modal.classList.remove('open');

    }

    function simPrevPage() {

      if (currentPageIndex > 0) {

        prevPage();

        renderSimulatorPage();

      }

    }

    function simNextPage() {

      if (currentPageIndex < totalPages - 1) {

        nextPage();

        renderSimulatorPage();

      }

    }

    function renderSimulatorPage() {

      stopSimAllAudio();

      const pageNumDisplay = currentPageIndex + 1;

      const page = pagesData[currentPageIndex];

      const actualPdfPath = page.pdfSource || currentPdfPath;

      const actualPdfPageNum = page.pageNumber !== undefined ? page.pageNumber : pageNumDisplay;

      document.getElementById('sim-page-title').textContent = page.title || `Page ${pageNumDisplay}`;

      document.getElementById('sim-page-num').textContent = `${pageNumDisplay} / ${totalPages}`;

      const simImg = document.getElementById('sim-page-img');

      simImg.onload = () => {

        setupSimAnnotCanvas();

      };

      if (page.isBlank || actualPdfPageNum < 1) {

        simImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1131" style="background:%23ffffff"><text x="50%" y="50%" text-anchor="middle" font-size="28" fill="%23ccc">Page vierge</text></svg>';

      } else {

        simImg.src = `/api/page-preview?pdf=${encodeURIComponent(actualPdfPath)}&page=${actualPdfPageNum}`;

      }

      // Ambient audio toggle setup

      const ambientPill = document.getElementById('sim-ambient-pill');

      if (page.ambientAudio) {

        ambientPill.style.display = 'flex';

        document.getElementById('sim-ambient-label').textContent = 'OFF';

        ambientPill.classList.remove('active');

        simIsAmbientPlaying = false;

      } else {

        ambientPill.style.display = 'none';

      }

      // Populate hotspots

      const container = document.getElementById('sim-hotspots-container');

      container.innerHTML = '';

      page.interactions.forEach(inter => {

        if (inter.type === 'tts') {

          const btn = document.createElement('div');

          btn.className = 'sim-tts-btn';

          btn.id = `sim-btn-${inter.id}`;

          btn.style.left = inter.x;

          btn.style.top = inter.y;

          btn.innerHTML = AUDIO_ICON_SVG;

          btn.title = inter.title || 'Écouter la synthèse vocale';

          btn.addEventListener('click', (e) => {

            e.stopPropagation();

            handleSimTtsClick(inter, btn);

          });

          container.appendChild(btn);

        } else if (inter.type === 'audio') {

          const btn = document.createElement('div');

          btn.className = 'sim-audio-btn';

          btn.id = `sim-btn-${inter.id}`;

          btn.style.left = inter.x;

          btn.style.top = inter.y;

          btn.innerHTML = AUDIO_ICON_SVG;

          btn.title = inter.title || 'Écouter la piste audio';

          btn.addEventListener('click', (e) => {

            e.stopPropagation();

            handleSimAudioClick(inter, btn);

          });

          container.appendChild(btn);

        } else if (inter.type === 'video') {

          const btn = document.createElement('div');

          btn.className = 'sim-video-btn';

          btn.id = `sim-btn-${inter.id}`;

          btn.style.left = inter.x;

          btn.style.top = inter.y;

          if (inter.size) {

            btn.style.width = inter.size + 'px';

            btn.style.height = inter.size + 'px';

            btn.style.fontSize = Math.max(12, inter.size * 0.45) + 'px';

          }

          btn.innerHTML = `<span style="font-size:15px;line-height:1;margin-left:2px;display:flex;align-items:center;justify-content:center;color:#fff;">▶</span>`;

          btn.title = inter.title || 'Regarder la vidéo YouTube';

          btn.addEventListener('click', (e) => {

            e.stopPropagation();

            stopSimAllAudio();

            openStudioVideoModal(inter.youtubeUrl, inter.title);

          });

          container.appendChild(btn);

        } else if (inter.type === 'modal' || inter.type === 'zoom') {

          const zone = document.createElement('div');

          zone.className = 'sim-modal-zone';

          zone.style.left = inter.x;

          zone.style.top = inter.y;

          zone.style.width = inter.width || '40%';

          zone.style.height = inter.height || '30%';

          zone.title = `🔍 ${inter.title || 'Zoom HD'} (cliquer pour agrandir)`;

          const loupeBtn = document.createElement('div');

          loupeBtn.className = 'sim-zoom-loupe-btn';

          loupeBtn.innerHTML = ZOOM_LOUPE_SVG;

          zone.appendChild(loupeBtn);

          zone.addEventListener('click', (e) => {

            e.stopPropagation();

            stopSimAllAudio();

            const imgSrc = getModalImageUrl(page, inter);

            openStudioModal(imgSrc, inter.title || 'Zoom HD');

          });

          container.appendChild(zone);

        } else if (inter.type === 'fill-blank') {

          const wrap = document.createElement('div');

          wrap.className = 'widget-fill-blank';

          wrap.style.left = inter.x; wrap.style.top = inter.y;

          wrap.style.width = inter.width || '15%'; wrap.style.height = inter.height || '5%';

          const input = document.createElement('input');

          input.type = 'text';

          input.className = 'fill-input';

          input.id = 'sim-fill-' + inter.id;

          input.dataset.answer = (inter.answer || '').toLowerCase().trim();

          input.dataset.alt = (inter.acceptAlternatives || '').toLowerCase().trim();

          input.dataset.caseSensitive = inter.caseSensitive ? '1' : '0';

          input.dataset.groupId = inter.groupId || '';

          input.addEventListener('input', () => {

            input.classList.remove('correct', 'incorrect');

          });

          wrap.appendChild(input);

          if (inter.hint) {

            const hBtn = document.createElement('button');

            hBtn.className = 'hint-btn';

            hBtn.innerHTML = '❓';

            hBtn.title = 'Indice';

            hBtn.addEventListener('click', (e) => {

              e.stopPropagation();

              alert(inter.hint);

            });

            wrap.appendChild(hBtn);

          }

          container.appendChild(wrap);

        } else if (inter.type === 'reveal') {

          if (inter.revealText) {

            const textDiv = document.createElement('div');

            textDiv.className = 'widget-reveal-text';

            textDiv.id = 'sim-rev-text-' + inter.id;

            textDiv.style.left = inter.x; textDiv.style.top = inter.y;

            textDiv.style.width = inter.width || '25%'; textDiv.style.height = inter.height || '5%';

            textDiv.textContent = inter.revealText;

            container.appendChild(textDiv);

          }

          const mask = document.createElement('div');

          mask.className = 'widget-reveal';

          mask.id = 'sim-rev-' + inter.id;

          mask.style.left = inter.x; mask.style.top = inter.y;

          mask.style.width = inter.width || '25%'; mask.style.height = inter.height || '5%';

          mask.style.background = inter.coverColor || '#f59e0b';

          mask.textContent = inter.coverLabel || '💡 Cliquer pour révéler';

          mask.addEventListener('click', (e) => {

            e.stopPropagation();

            mask.classList.add('revealed');

            const rt = document.getElementById('sim-rev-text-' + inter.id);

            if (rt) rt.classList.add('visible');

            if (inter.revealAudio) {

              try {

                const audio = new Audio('/api/media-preview?path=' + encodeURIComponent(inter.revealAudio));

                audio.play().catch(()=>{});

              } catch(err) {}

            }

          });

          container.appendChild(mask);

        } else if (inter.type === 'checkbox-task') {

          const cb = document.createElement('div');

          cb.className = 'widget-checkbox';

          cb.id = 'sim-chk-' + inter.id;

          cb.style.left = inter.x; cb.style.top = inter.y;

          if (inter.size) {

            cb.style.width = inter.size + 'px';

            cb.style.height = inter.size + 'px';

            cb.style.fontSize = Math.max(14, inter.size * 0.5) + 'px';

          }

          cb.dataset.checked = '0';

          cb.dataset.correct = inter.isCorrect ? '1' : '0';

          cb.dataset.groupId = inter.groupId || '';

          if (inter.hideLabel) {

            cb.style.padding = '2px';

            cb.style.gap = '0';

            cb.innerHTML = `<div class="chk-box" id="sim-chkbox-${inter.id}"></div>`;

          } else {

            cb.innerHTML = `<div class="chk-box" id="sim-chkbox-${inter.id}"></div><span class="chk-label">${inter.label || ''}</span>`;

          }

          cb.addEventListener('click', (e) => {

            e.stopPropagation();

            const isChecked = cb.dataset.checked === '1';

            cb.dataset.checked = isChecked ? '0' : '1';

            const box = cb.querySelector('.chk-box');

            if (box) {

              box.textContent = isChecked ? '' : '✓';

              box.classList.toggle('checked', !isChecked);

            }

          });

          container.appendChild(cb);

        } else if (inter.type === 'validation-btn') {

          const btn = document.createElement('button');

          btn.className = 'widget-validation-btn';

          btn.style.left = inter.x; btn.style.top = inter.y;

          btn.style.width = inter.width || '15%'; btn.style.height = inter.height || '6%';

          btn.textContent = inter.label || '✓ Corriger';

          btn.addEventListener('click', (e) => {

            e.stopPropagation();

            if (window.FBEngine) {

              if (inter.actionType === 'validate') window.FBEngine.validateGroup(inter.groupId || '');

              else if (inter.actionType === 'reveal') window.FBEngine.revealAnswers(inter.groupId || '');

              else if (inter.actionType === 'reset') window.FBEngine.resetGroup(inter.groupId || '');

            }

          });

          container.appendChild(btn);

        }

      });

    }

    async function handleSimTtsClick(inter, btn) {

      if (simActiveTtsId === inter.id) {

        stopSimAllAudio();

        return;

      }

      stopSimAllAudio();

      if (!('speechSynthesis' in window)) {

        alert("La synthèse vocale n'est pas supportée dans votre navigateur.");

        return;

      }

      simActiveTtsId = inter.id;

      btn.classList.add('speaking');

      const statusMsgEl = document.getElementById('sim-status-msg');

      if (statusMsgEl) {

        statusMsgEl.innerHTML = `🗣️ Lecture vocale en cours : <strong>${escapeHtml(inter.title || 'Texte')}</strong>`;

      }

      const page = pagesData[currentPageIndex];

      const pageWords = await getPageWordsData(page.pageNumber);

      const simKaraokeLayer = document.getElementById('sim-karaoke-page-layer');

      const utt = new SpeechSynthesisUtterance(inter.text);

      utt.lang = inter.lang || detectTextLanguage(inter.text) || 'en-US';

      utt.rate = 0.80; // Rythme posé et didactique pour l'apprentissage

      const { tokens } = buildKaraokeTokens(inter.text);

      const nx = parseFloat(String(inter.x).replace('%', ''));

      const ny = parseFloat(String(inter.y).replace('%', ''));

      utt.onend = () => {

        btn.classList.remove('speaking');

        simActiveTtsId = null;

        clearDirectKaraoke(simKaraokeLayer);

        if (statusMsgEl) {

          statusMsgEl.innerHTML = `💡 Cliquez sur <strong>🗣️</strong> pour écouter la synthèse vocale, <strong>🎧</strong> pour lancer l'audio, ou <strong>🔍</strong> pour tester le zoom haute définition.`;

        }

      };

      utt.onerror = () => {

        btn.classList.remove('speaking');

        simActiveTtsId = null;

        clearDirectKaraoke(simKaraokeLayer);

      };

      if (inter.karaoke !== false && simKaraokeLayer) {

        startDirectPageKaraoke(utt, tokens, pageWords, nx, ny, simKaraokeLayer);

      }

      simSpeechUtterance = utt;

      window.speechSynthesis.speak(utt);

    }

    function handleSimAudioClick(inter, btn) {

      if (simActiveAudioId === inter.id) {

        stopSimAllAudio();

        return;

      }

      stopSimAllAudio();

      if (!inter.src) {

        alert("Aucun fichier audio n'est assigné à cette puce.");

        return;

      }

      simActiveAudioId = inter.id;

      btn.classList.add('playing');

      simAudioElement = new Audio('/api/media-preview?path=' + encodeURIComponent(inter.src));

      simAudioElement.play().catch(e => {

        console.error(e);

        btn.classList.remove('playing');

        simActiveAudioId = null;

      });

      simAudioElement.onended = () => {

        btn.classList.remove('playing');

        simActiveAudioId = null;

      };

    }

    function toggleSimAmbient() {

      const page = pagesData[currentPageIndex];

      if (!page.ambientAudio) return;

      const pill = document.getElementById('sim-ambient-pill');

      const label = document.getElementById('sim-ambient-label');

      if (simIsAmbientPlaying) {

        if (simAmbientAudio) {

          simAmbientAudio.pause();

          simAmbientAudio = null;

        }

        simIsAmbientPlaying = false;

        label.textContent = 'OFF';

        pill.classList.remove('active');

      } else {

        simAmbientAudio = new Audio('/api/media-preview?path=' + encodeURIComponent(page.ambientAudio));

        simAmbientAudio.loop = true;

        simAmbientAudio.play().catch(e => console.warn(e));

        simIsAmbientPlaying = true;

        label.textContent = 'ON';

        pill.classList.add('active');

      }

    }

    function stopSimAllAudio() {

      if ('speechSynthesis' in window) {

        window.speechSynthesis.cancel();

      }

      clearDirectKaraoke();

      if (currentKaraokeState) {

        if (currentKaraokeState.fallbackTimer) clearInterval(currentKaraokeState.fallbackTimer);

        currentKaraokeState = null;

      }

      if (simActiveTtsId) {

        const prevBtn = document.getElementById(`sim-btn-${simActiveTtsId}`);

        if (prevBtn) {

          prevBtn.classList.remove('speaking');

        }

        simActiveTtsId = null;

      }

      if (simAudioElement) {

        simAudioElement.pause();

        simAudioElement = null;

      }

      if (simAmbientAudio) {

        simAmbientAudio.pause();

        simAmbientAudio = null;

      }

      simIsAmbientPlaying = false;

      simActiveAudioId = null;

      document.querySelectorAll('.sim-tts-btn').forEach(b => {

        b.classList.remove('speaking');

      });

      document.querySelectorAll('.sim-audio-btn').forEach(b => b.classList.remove('playing'));

    }

    // Auto check for local PDFs & recovery on page load

