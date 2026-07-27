/* Aegiren — test interactif « 15 contrôles Microsoft 365 ».
   Tout se calcule dans le navigateur : aucune réponse n'est transmise,
   aucun stockage, aucun traceur. C'est la promesse affichée sur la page. */

(function () {
  var form = document.querySelector("[data-test]");
  if (!form) return;

  var balise = document.querySelector("[data-test-donnees]");
  var D = JSON.parse(balise.textContent);
  var T = D.t;
  var PAR_NUM = {};
  D.questions.forEach(function (q) { PAR_NUM[q.n] = q; });

  var compte = form.querySelector("[data-compte]");
  var barre = form.querySelector("[data-barre]");
  var alerte = form.querySelector("[data-alerte]");
  var zone = document.querySelector("[data-resultat]");
  var suite = document.querySelector("[data-suite]");

  function reponses() {
    var out = {};
    D.questions.forEach(function (q) {
      var coche = form.querySelector('input[name="q' + q.n + '"]:checked');
      if (coche) out[q.n] = coche.value;
    });
    return out;
  }

  function majProgression() {
    var n = Object.keys(reponses()).length;
    compte.textContent = n;
    barre.style.width = (n / D.questions.length) * 100 + "%";
  }

  form.addEventListener("change", function (e) {
    if (e.target.type === "radio") {
      majProgression();
      var bloc = e.target.closest(".q");
      if (bloc) bloc.classList.remove("est-erreur");
      if (!alerte.hidden && Object.keys(reponses()).length === D.questions.length) alerte.hidden = true;
    }
  });

  function echappe(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function rendre(rep) {
    var v = 0, o = 0, r = 0;
    D.questions.forEach(function (q) {
      var a = rep[q.n];
      if (a === "v") v++; else if (a === "o") o++; else r++;
    });
    var score = Math.round(((v + o * 0.5) / D.questions.length) * 100);
    var bande = r >= 5 ? "rouge" : (r >= 1 ? "orange" : "vert");
    var titre = T.bandes[bande][0];
    var texte = T.bandes[bande][1];

    // Points ouverts, classés par impact décroissant (rang), rouges avant oranges.
    var ouverts = D.questions
      .filter(function (q) { return rep[q.n] !== "v"; })
      .sort(function (a, b) {
        var pa = rep[a.n] === "r" ? 0 : 1;
        var pb = rep[b.n] === "r" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return a.rang - b.rang;
      });

    var html = '<div class="resultat__tete">' +
      '<div class="jauge" style="--pct:' + score + '" role="img" aria-label="' + score + ' / 100">' +
      '<span class="jauge__valeur">' + score + "</span>" +
      '<span class="jauge__sur">' + echappe(T.score_label) + "</span></div>" +
      '<div class="resultat__texte">' +
      '<span class="kicker">' + echappe(T.res_titre) + "</span>" +
      "<h2>" + echappe(titre) + "</h2>" +
      "<p>" + texte + "</p>" +
      '<div class="decompte">' +
      '<span class="v">' + v + " " + echappe(T.decompte_v) + "</span>" +
      '<span class="o">' + o + " " + echappe(T.decompte_o) + "</span>" +
      '<span class="r">' + r + " " + echappe(T.decompte_r) + "</span>" +
      "</div></div></div>";

    if (ouverts.length) {
      var items = ouverts.map(function (q, i) {
        var rouge = rep[q.n] === "r";
        return '<li><span class="rang">' + String(i + 1).padStart(2, "0") + "</span><div>" +
          '<span class="verdict ' + (rouge ? "r" : "o") + '">' +
          echappe(rouge ? T.verdict_r : T.verdict_o) + " · " +
          ("00" + q.n).slice(-2) + " / 15</span>" +
          "<h4>" + echappe(q.titre) + "</h4><p>" + echappe(q.action) + "</p></div></li>";
      }).join("");
      html += '<div class="priorites"><h3>' + echappe(T.prio_titre) + "</h3><p>" +
        echappe(T.prio_intro) + "</p><ol>" + items + "</ol></div>";
    } else {
      html += '<div class="priorites"><h3>' + echappe(T.rien_titre) + "</h3><p>" +
        echappe(T.rien_texte) + "</p></div>";
    }

    zone.innerHTML = html;
    zone.hidden = false;
    suite.hidden = false;
    zone.focus();
    zone.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var rep = reponses();
    var manquantes = D.questions.filter(function (q) { return !rep[q.n]; });
    if (manquantes.length) {
      var liens = manquantes.map(function (q) {
        return '<a href="#q' + q.n + '" data-vers="' + q.n + '">' + String(q.n).padStart(2, "0") + " — " + echappe(q.titre) + "</a>";
      }).join("");
      alerte.innerHTML = '<span class="alerte__pastille" aria-hidden="true">✕</span>' +
        '<div class="alerte__corps"><span class="alerte__titre">' + T.incomplet + "</span>" + liens + "</div>";
      alerte.hidden = false;
      manquantes.forEach(function (q) {
        var bloc = form.querySelector('[data-q="' + q.n + '"]');
        if (bloc) bloc.classList.add("est-erreur");
      });
      alerte.querySelectorAll("[data-vers]").forEach(function (a) {
        a.addEventListener("click", function (ev) {
          ev.preventDefault();
          var bloc = form.querySelector('[data-q="' + a.getAttribute("data-vers") + '"]');
          if (bloc) {
            bloc.scrollIntoView({ behavior: "smooth", block: "center" });
            var premier = bloc.querySelector("input");
            if (premier) premier.focus();
          }
        });
      });
      alerte.focus();
      alerte.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    rendre(rep);
  });

  majProgression();
})();
