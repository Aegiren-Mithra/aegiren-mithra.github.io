/* Aegiren — formulaire de contact (seul JavaScript des pages courantes).
   États conformes au handoff « Site — Micro-états » : validation à la
   soumission, récapitulatif role="alert", envoi avec champs gelés,
   confirmation role="status", redirection vers la page de remerciement.

   ENVOI
   ─────
   FORM_ENDPOINT renseigné  → POST vers le service Google Apps Script, qui
     envoie un e-mail HTML stylisé à contact@aegiren.com. Installation en
     5 minutes : voir Site\formulaire\A-LIRE.txt.
   FORM_ENDPOINT vide       → repli « mailto » : le message est remis au
     logiciel de messagerie du visiteur. Le repli sert aussi de filet si
     l'endpoint est injoignable — aucune demande n'est jamais perdue. */

var FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycby_hkzG2A-aK9eExjO2Begee-I1Ovmp91PxPugHGQVUd1DWMXSKiOGGC2bx4l4_CuVhlQ/exec";
var CONTACT_EMAIL = "contact@aegiren.com";
var CHARGEMENT = Date.now();

(function () {
  var form = document.querySelector("[data-formulaire]");
  if (!form) return;

  var lang = form.getAttribute("data-lang") || "fr";
  var urlMerci = form.getAttribute("data-merci") || "/fr/merci/";
  var T = lang === "en" ? {
    recapTitre: function (n) { return n > 1 ? n + " fields need fixing before sending." : "One field needs fixing before sending."; },
    emailLabel: "Your email",
    emailVide: "your email address is missing.",
    emailForme: "this address looks incomplete — check the domain.",
    msgLabel: "Your situation",
    msgVide: "a couple of lines help us reply usefully.",
    envoi: "Sending…",
    okTitre: "Request sent.",
    okDetail: function (mail) { return "You'll hear back within 48 business hours at " + mail + "."; },
    mailtoTitre: "One last step — send us this message.",
    mailtoDetail: "We tried to open your email app. If nothing happened, copy the message below and send it to " + CONTACT_EMAIL + ".",
    copier: "Copy the message",
    copie: "Copied",
    sujet: "Intro request — Aegiren"
  } : {
    recapTitre: function (n) { return n > 1 ? n + " champs à corriger avant l'envoi." : "Un champ à corriger avant l'envoi."; },
    emailLabel: "Votre e-mail",
    emailVide: "votre adresse e-mail est manquante.",
    emailForme: "cette adresse semble incomplète — vérifiez le domaine.",
    msgLabel: "Votre situation",
    msgVide: "deux lignes suffisent pour vous répondre utilement.",
    envoi: "Envoi…",
    okTitre: "Demande envoyée.",
    okDetail: function (mail) { return "Réponse sous 48 h ouvrées à " + mail + "."; },
    mailtoTitre: "Dernière étape — envoyez-nous ce message.",
    mailtoDetail: "Nous avons tenté d'ouvrir votre messagerie. Si rien ne s'est passé, copiez le message ci-dessous et envoyez-le à " + CONTACT_EMAIL + ".",
    copier: "Copier le message",
    copie: "Copié",
    sujet: "Demande d'échange — Aegiren"
  };

  var champEmail = form.querySelector("#c-email");
  var champMsg = form.querySelector("#c-msg");
  var bouton = form.querySelector("[data-envoyer]");
  var texteBouton = bouton.textContent;
  var zoneAlerte = form.querySelector("[data-alerte]");
  var zoneStatut = form.querySelector("[data-statut]");

  /* Échappe une valeur saisie par le visiteur avant toute insertion dans du
     HTML. Ajouté le 27/07/2026 : l'adresse e-mail repartait telle quelle dans
     le message de confirmation via innerHTML. Le risque était limité — on ne
     pouvait s'attaquer qu'à soi-même — mais un point d'injection non échappé
     sur le site d'un cabinet de sécurité n'a pas à exister. */
  function echapper(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function poserErreur(champ, message) {
    var bloc = champ.closest(".champ");
    bloc.classList.add("est-erreur");
    var err = bloc.querySelector(".champ__erreur");
    if (!err) {
      err = document.createElement("span");
      err.className = "champ__erreur";
      err.innerHTML = '<span class="glyphe" aria-hidden="true">✕</span><span></span>';
      bloc.appendChild(err);
    }
    err.lastElementChild.textContent = message.charAt(0).toUpperCase() + message.slice(1);
    champ.setAttribute("aria-invalid", "true");
  }

  function nettoyer() {
    zoneAlerte.hidden = true;
    zoneAlerte.innerHTML = "";
    zoneStatut.hidden = true;
    form.querySelectorAll(".champ.est-erreur").forEach(function (b) {
      b.classList.remove("est-erreur");
      var e = b.querySelector(".champ__erreur");
      if (e) e.remove();
    });
    form.querySelectorAll("[aria-invalid]").forEach(function (c) { c.removeAttribute("aria-invalid"); });
  }

  function valider() {
    var fautes = [];
    var email = champEmail.value.trim();
    var msg = champMsg.value.trim();
    if (!email) fautes.push({ champ: champEmail, libelle: T.emailLabel, message: T.emailVide });
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fautes.push({ champ: champEmail, libelle: T.emailLabel, message: T.emailForme });
    if (!msg) fautes.push({ champ: champMsg, libelle: T.msgLabel, message: T.msgVide });
    return fautes;
  }

  function afficherRecap(fautes) {
    var liens = fautes.map(function (f) {
      return '<a href="#' + f.champ.id + '">' + f.libelle + " — " + f.message.replace(/\.$/, "") + "</a>";
    }).join("");
    zoneAlerte.innerHTML =
      '<span class="alerte__pastille" aria-hidden="true">✕</span>' +
      '<div class="alerte__corps"><span class="alerte__titre">' + T.recapTitre(fautes.length) + "</span>" + liens + "</div>";
    zoneAlerte.hidden = false;
    fautes.forEach(function (f) { poserErreur(f.champ, f.message); });
    zoneAlerte.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var cible = document.getElementById(a.getAttribute("href").slice(1));
        if (cible) cible.focus();
      });
    });
    zoneAlerte.focus && zoneAlerte.focus();
  }

  function geler(oui) {
    form.querySelectorAll("input, textarea, select").forEach(function (c) { c.disabled = oui; });
    if (oui) {
      bouton.classList.add("est-occupe");
      bouton.innerHTML = '<span class="rouet" aria-hidden="true"></span>' + T.envoi;
    } else {
      bouton.classList.remove("est-occupe");
      bouton.textContent = texteBouton;
    }
  }

  function afficherStatut(titre, detail) {
    zoneStatut.innerHTML =
      '<span class="statut__pastille" aria-hidden="true">✓</span>' +
      '<div class="statut__corps"><span class="statut__titre">' + titre + "</span>" +
      '<span class="statut__detail">' + detail + "</span></div>";
    zoneStatut.hidden = false;
  }

  /* Repli sans endpoint : on tente d'ouvrir la messagerie du visiteur, mais
     beaucoup de postes n'ont aucun client de messagerie associé au protocole
     mailto (webmail uniquement). On affiche donc toujours le message rédigé,
     avec un bouton de copie : la demande n'est jamais perdue. */
  function versMailto(donnees) {
    var corps = donnees.message + "\n\n---\n" +
      (donnees.besoin && donnees.besoin !== "—" ? "Besoin : " + donnees.besoin + "\n" : "") +
      (donnees.postes && donnees.postes !== "—" ? "Postes : " + donnees.postes + "\n" : "") +
      (donnees.environnement && donnees.environnement !== "—" ? "Environnement : " + donnees.environnement + "\n" : "") +
      (donnees.echeance ? "Échéance : " + donnees.echeance + "\n" : "") +
      "Répondre à : " + donnees.email;
    try {
      window.location.href = "mailto:" + CONTACT_EMAIL +
        "?subject=" + encodeURIComponent(T.sujet) +
        "&body=" + encodeURIComponent(corps);
    } catch (err) { /* aucun client de messagerie : on continue */ }

    zoneStatut.innerHTML =
      '<span class="statut__pastille" aria-hidden="true">✓</span>' +
      '<div class="statut__corps"><span class="statut__titre">' + T.mailtoTitre + "</span>" +
      '<span class="statut__detail">' + T.mailtoDetail + "</span>" +
      '<pre class="statut__message" data-message></pre>' +
      '<div class="statut__actions">' +
      '<button type="button" class="btn btn--contour btn--petit" data-copier>' + T.copier + "</button>" +
      '<a class="lien-fort" href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + "</a>" +
      "</div></div>";
    zoneStatut.querySelector("[data-message]").textContent = corps;
    zoneStatut.hidden = false;

    var bouton = zoneStatut.querySelector("[data-copier]");
    bouton.addEventListener("click", function () {
      var ok = function () { bouton.textContent = T.copie + " ✓"; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(corps).then(ok, function () {});
      } else {
        var zone = zoneStatut.querySelector("[data-message]");
        var plage = document.createRange();
        plage.selectNodeContents(zone);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(plage);
        try { document.execCommand("copy"); ok(); } catch (err) {}
      }
    });
    zoneStatut.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    nettoyer();
    if (form.querySelector("[name='entreprise-site']").value) return; // pot de miel : robots
    var fautes = valider();
    if (fautes.length) { afficherRecap(fautes); return; }

    var donnees = {
      email: champEmail.value.trim(),
      message: champMsg.value.trim(),
      besoin: (form.querySelector("#c-besoin") || {}).value || "",
      postes: (form.querySelector("#c-postes") || {}).value || "",
      environnement: (form.querySelector("#c-env") || {}).value || "",
      echeance: (form.querySelector("#c-echeance") || {}).value || "",
      lang: lang,
      "entreprise-site": "",
      // Temps écoulé depuis le chargement de la page. Le service ignore les
      // envois de moins de 2,5 s : un humain n'écrit pas sa situation en deux
      // secondes, un robot si. Voir pipeline\formulaire\Code.gs.
      ms: Date.now() - CHARGEMENT
    };

    if (!FORM_ENDPOINT) { versMailto(donnees); return; }

    geler(true);
    // Content-Type text/plain : évite la requête préliminaire CORS, qu'Apps Script ne gère pas.
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(donnees),
      redirect: "follow"
    }).then(function (rep) {
      if (!rep.ok) throw new Error("HTTP " + rep.status);
      return rep.json();
    }).then(function (res) {
      if (!res || res.ok !== true) throw new Error("refus du service");
      afficherStatut(T.okTitre, T.okDetail(echapper(donnees.email)));
      setTimeout(function () { window.location.href = urlMerci; }, 900);
    }).catch(function () {
      // Filet : l'envoi direct a échoué, on ne perd pas la demande.
      geler(false);
      versMailto(donnees);
    });
  });
})();
