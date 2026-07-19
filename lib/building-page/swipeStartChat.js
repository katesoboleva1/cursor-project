/**
 * Swipe-to-chat — investor property messenger (Auto.ru-style layout).
 * Desktop: left chat list + right conversation (right drawer).
 * Mobile: fullscreen + left micro object rail.
 */
function swipeStartChatCss() {
  return `
    /* --- swipe-to-chat (investor pre-view) --- */
    .unit-hints{display:flex;flex-wrap:wrap;gap:.3rem;margin:0 0 .45rem}
    .uh-chip{display:inline-flex;align-items:center;gap:.2rem;padding:.22rem .5rem;border-radius:999px;font-size:.65rem;font-weight:700;border:1px solid var(--line);background:rgba(0,0,0,.22);color:var(--muted);line-height:1.2}
    .uh-chip b{color:var(--text);font-weight:800}
    .uh-chip.good{color:#86efac;border-color:rgba(94,228,168,.4);background:rgba(94,228,168,.1)}
    .uh-chip.warn{color:#fcd34d;border-color:rgba(251,191,36,.45);background:rgba(251,191,36,.1)}
    .uh-chip.bad{color:#fca5a5;border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.1)}
    .uh-chip.info{color:#7dd3fc;border-color:rgba(62,207,207,.4);background:rgba(62,207,207,.1)}
    .uh-chip.note{color:#e9d5ff;border-color:rgba(196,181,253,.4);background:rgba(196,181,253,.1)}
    .swipe-chat-wrap{display:flex;flex-direction:column;gap:.4rem;width:100%;position:relative}
    .swipe-chat-wrap--desk{
      flex:0 0 auto;padding:10px 12px calc(10px + var(--safe));
      border-top:1px solid rgba(255,255,255,.06);background:rgba(0,0,0,.28);
    }
    .swipe-chat-wrap--card{margin-top:12px;padding-top:4px}
    .swipe-chat-wrap--dock{gap:.35rem;margin:0}
    .mob-broker-dock{display:none}
    .mob-broker-dock-thread{
      display:flex;flex-direction:column;gap:.35rem;max-height:88px;overflow:auto;
      -webkit-overflow-scrolling:touch;
    }
    .mob-dock-msg{
      max-width:96%;padding:.45rem .6rem;border-radius:12px;font-size:.72rem;line-height:1.35;
    }
    .mob-dock-msg.bot{
      align-self:flex-start;background:#17232d;border:1px solid rgba(255,255,255,.06);
      border-bottom-left-radius:4px;color:var(--text);
    }
    .mob-dock-msg .meta{
      display:block;font-size:9px;color:var(--muted);margin-bottom:2px;
      font-weight:800;letter-spacing:.04em;text-transform:uppercase;
    }
    .mob-dock-msg b{color:var(--sand);font-weight:800}
    .swipe-chat{
      position:relative;height:54px;border-radius:999px;overflow:hidden;
      background:linear-gradient(105deg,#3ecfcf 0%,#2bb3b3 45%,#d8c3a5 100%);
      box-shadow:0 10px 28px rgba(62,207,207,.28),0 4px 12px rgba(0,0,0,.3);
      touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;
    }
    .swipe-chat.is-done{background:linear-gradient(105deg,#5ee4a8 0%,#34d399 100%);box-shadow:0 10px 28px rgba(94,228,168,.35)}
    .swipe-chat-fill{
      position:absolute;inset:0 auto 0 0;width:0;border-radius:999px;
      background:linear-gradient(90deg,rgba(255,255,255,.22),rgba(255,255,255,.08));
      pointer-events:none;
    }
    .swipe-chat-label{
      position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
      font-weight:800;font-size:.82rem;letter-spacing:.01em;color:#031016;
      pointer-events:none;padding-left:58px;padding-right:40px;text-align:center;line-height:1.15;
    }
    .swipe-chat.is-done .swipe-chat-label{color:#031016}
    .swipe-chat-thumb{
      position:absolute;top:4px;left:4px;height:46px;width:58px;border-radius:999px;
      background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.2);
      display:flex;align-items:center;justify-content:center;cursor:grab;z-index:2;touch-action:none;
    }
    .swipe-chat-thumb:active{cursor:grabbing}
    .swipe-chat-thumb .mark-mini{width:26px;height:26px;border-radius:8px;overflow:hidden}
    .swipe-chat-thumb svg{width:26px;height:26px;display:block}
    .swipe-chat-end{
      position:absolute;right:8px;top:50%;transform:translateY(-50%);
      width:32px;height:32px;border-radius:50%;overflow:hidden;
      border:2px solid rgba(255,255,255,.55);background:rgba(3,16,22,.25);pointer-events:none;
    }
    .swipe-chat-end img{width:100%;height:100%;object-fit:cover;display:block}

    /* --- unicorn celebrate — clipped to swipe / chat header zone only --- */
    .uni-celeb-stage{
      position:relative;height:0;margin:0;
      overflow:hidden;pointer-events:none;z-index:3;
    }
    .uni-celeb-stage:has(.uni-celeb){
      height:112px;margin:0 0 -8px;
    }
    .uni-celeb{
      position:absolute;inset:0;z-index:3;pointer-events:none;
      overflow:hidden;opacity:0;
      transition:opacity .12s ease;
    }
    .uni-celeb.is-on{opacity:1}
    .uni-celeb-glow{
      position:absolute;left:50%;top:68%;
      width:120px;height:56px;transform:translate(-50%,-50%);
      border-radius:50%;
      background:radial-gradient(ellipse closest-side,
        rgba(249,168,212,.5) 0%,
        rgba(62,207,207,.22) 42%,
        transparent 72%);
      filter:blur(12px);
      animation:uniGlow 1.05s cubic-bezier(.22,.7,.28,1) forwards;
    }
    .uni-celeb-ring{
      position:absolute;left:50%;top:74%;
      width:24px;height:24px;margin:-12px 0 0 -12px;
      border-radius:50%;
      border:1.5px solid rgba(249,168,212,.55);
      box-shadow:0 0 14px rgba(249,168,212,.35), inset 0 0 8px rgba(255,255,255,.15);
      animation:uniRing .95s cubic-bezier(.16,.8,.28,1) forwards;
    }
    .uni-celeb-uni{
      position:absolute;left:50%;top:78%;
      font-size:2.1rem;line-height:1;
      transform:translate(-50%,0);
      filter:drop-shadow(0 6px 14px rgba(249,168,212,.55))
             drop-shadow(0 0 10px rgba(62,207,207,.25));
      will-change:transform,opacity;
      animation:uniArc 1.05s cubic-bezier(.22,.82,.28,1) forwards;
    }
    .uni-celeb-spark{
      position:absolute;left:50%;top:58%;
      width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;
      background:radial-gradient(circle,#fff 0%,#f9a8d4 48%,transparent 72%);
      box-shadow:0 0 8px rgba(249,168,212,.65);
      animation:uniSpark .95s cubic-bezier(.2,.75,.25,1) forwards;
      opacity:0;
    }
    .uni-celeb-spark.tone-sea{
      background:radial-gradient(circle,#fff 0%,#5eead4 48%,transparent 72%);
      box-shadow:0 0 8px rgba(62,207,207,.55);
    }
    .uni-celeb-spark.tone-sand{
      background:radial-gradient(circle,#fff 0%,#fcd34d 48%,transparent 72%);
      box-shadow:0 0 8px rgba(251,191,36,.5);
    }
    @keyframes uniArc{
      0%{transform:translate(-50%,8px) scale(.42) rotate(-12deg);opacity:0}
      14%{opacity:1}
      42%{transform:translate(calc(-50% + 10px),-48px) scale(1.08) rotate(6deg);opacity:1}
      72%{transform:translate(calc(-50% + 22px),-28px) scale(1) rotate(-2deg);opacity:1}
      100%{transform:translate(calc(-50% + 30px),-8px) scale(.82) rotate(5deg);opacity:0}
    }
    @keyframes uniGlow{
      0%{opacity:0;transform:translate(-50%,-50%) scale(.55)}
      28%{opacity:1;transform:translate(-50%,-50%) scale(1.05)}
      100%{opacity:0;transform:translate(-50%,-50%) scale(1.28)}
    }
    @keyframes uniRing{
      0%{transform:scale(.35);opacity:0}
      22%{opacity:.85}
      100%{transform:scale(2.6);opacity:0}
    }
    @keyframes uniSpark{
      0%{transform:translate(0,0) scale(.25);opacity:0}
      18%{opacity:.95}
      100%{transform:translate(var(--dx,0),var(--dy,-28px)) scale(1.05);opacity:0}
    }

    /* confetti — clipped to chat panel header */
    .chat-confetti-stage{
      position:absolute;left:0;right:0;top:0;height:170px;
      overflow:hidden;pointer-events:none;z-index:6;
    }
    .chat-confetti-stage canvas{display:block;width:100%;height:100%}
    @media (prefers-reduced-motion:reduce){
      .uni-celeb,.uni-celeb-uni,.uni-celeb-spark,.uni-celeb-glow,.uni-celeb-ring,
      .chat-confetti-stage{animation:none!important;display:none!important}
    }

    /* ===== messenger sheet (prototype layout) ===== */
    .chat-sheet{
      position:fixed;inset:0;z-index:80;display:none;
      align-items:stretch;justify-content:flex-end;
      background:rgba(3,16,22,.5);backdrop-filter:blur(4px);padding:0;
    }
    .chat-sheet.is-on{display:flex}
    .chat-sheet-panel{
      width:min(960px,100%);height:100%;max-height:100%;
      background:#0b1620;border:0;border-left:1px solid var(--line);
      border-radius:0;box-shadow:-20px 0 60px rgba(0,0,0,.45);
      display:flex;flex-direction:column;min-height:0;
      animation:chatSheetRight .28s ease;
      position:relative;overflow:hidden;
    }
    @keyframes chatSheetRight{from{transform:translateX(24px);opacity:.55}to{transform:none;opacity:1}}
    @keyframes chatSheetUp{from{transform:translateY(16px);opacity:.55}to{transform:none;opacity:1}}
    @media (prefers-reduced-motion:reduce){.chat-sheet-panel{animation:none}}

    .chat-sheet-layout{display:flex;flex:1;min-height:0;min-width:0}

    /* --- left: chat list (desktop) / micro rail (mobile) --- */
    .chat-rail{
      display:flex;flex:0 0 300px;width:300px;flex-direction:column;min-height:0;
      border-right:1px solid var(--line);background:#08131a;
    }
    .chat-list-head{
      display:flex;align-items:center;gap:.55rem;
      padding:.85rem .9rem;border-bottom:1px solid var(--line);flex:0 0 auto;
    }
    .chat-list-head h2{
      margin:0;flex:1;font-size:1.15rem;font-weight:800;font-family:Fraunces,serif;color:var(--text);
    }
    .chat-sheet-x{
      flex:0 0 auto;width:36px;height:36px;border-radius:10px;
      border:1px solid var(--line);background:var(--elev);color:var(--text);
      font:inherit;font-weight:800;cursor:pointer;line-height:1;
    }
    .chat-list-body{
      flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;
      padding:.35rem 0;
    }
    .chat-list-empty{
      padding:1.2rem 1rem;font-size:.78rem;color:var(--muted);line-height:1.4;
    }
    .chat-list-row{
      width:100%;display:grid;grid-template-columns:52px 1fr auto;gap:.55rem;
      align-items:start;text-align:left;padding:.65rem .85rem;
      border:0;border-bottom:1px solid rgba(255,255,255,.04);
      background:transparent;color:inherit;cursor:pointer;font:inherit;
    }
    .chat-list-row:hover{background:rgba(62,207,207,.06)}
    .chat-list-row.is-on{background:rgba(62,207,207,.12)}
    .chat-list-thumb{
      width:52px;height:52px;border-radius:10px;overflow:hidden;
      background:#122029;border:1px solid var(--line);
    }
    .chat-list-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .chat-list-thumb .ph{
      width:100%;height:100%;display:grid;place-items:center;
      font-size:12px;font-weight:800;color:var(--sea);background:rgba(62,207,207,.1);
    }
    .chat-list-main{min-width:0}
    .chat-list-title{
      display:flex;align-items:center;gap:.35rem;margin:0 0 .15rem;
      font-size:.82rem;font-weight:800;color:var(--text);line-height:1.25;
    }
    .chat-list-title .dot{
      width:7px;height:7px;border-radius:50%;background:#34d399;flex:0 0 auto;
    }
    .chat-list-sub{
      margin:0;font-size:.72rem;color:var(--muted);line-height:1.3;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .chat-list-snip{
      margin:.2rem 0 0;font-size:.7rem;color:#8aa3ad;line-height:1.3;
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .chat-list-time{
      font-size:.65rem;color:var(--muted);font-weight:650;white-space:nowrap;padding-top:2px;
    }

    /* mobile micro variants (overridden in mq) */
    .chat-rail-chip{display:none}

    /* --- right: conversation --- */
    .chat-sheet-main{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;background:#0d1c24}
    .chat-conv-head{
      display:flex;align-items:center;gap:.65rem;
      padding:.75rem 1rem;border-bottom:1px solid var(--line);flex:0 0 auto;
    }
    .chat-conv-avatar{
      width:36px;height:36px;border-radius:50%;overflow:hidden;
      background:rgba(62,207,207,.15);border:1px solid rgba(62,207,207,.35);
      display:grid;place-items:center;font-size:.7rem;font-weight:800;color:var(--sea);flex:0 0 auto;
    }
    .chat-conv-avatar img{width:100%;height:100%;object-fit:cover}
    .chat-conv-who{flex:1;min-width:0}
    .chat-conv-who b{display:block;font-size:.92rem;font-weight:800;color:var(--text)}
    .chat-conv-who span{display:block;font-size:.7rem;color:var(--muted);line-height:1.35}
    .chat-conv-who .chat-conv-hint{margin-top:2px;opacity:.92}
    .chat-conv-menu{
      width:36px;height:36px;border-radius:10px;border:1px solid var(--line);
      background:transparent;color:var(--muted);font:inherit;font-size:1.1rem;cursor:pointer;
    }
    .chat-ctx{
      display:flex;align-items:center;gap:.7rem;
      padding:.65rem 1rem;border-bottom:1px solid var(--line);
      background:rgba(0,0,0,.18);flex:0 0 auto;
    }
    .chat-ctx-thumb{
      width:48px;height:48px;border-radius:10px;overflow:hidden;flex:0 0 auto;
      background:#122029;border:1px solid var(--line);
    }
    .chat-ctx-thumb img{width:100%;height:100%;object-fit:cover;display:block}
    .chat-ctx-thumb .ph{
      width:100%;height:100%;display:grid;place-items:center;font-size:11px;font-weight:800;color:var(--sea);
    }
    .chat-ctx-meta{min-width:0;flex:1}
    .chat-ctx-price{margin:0;font-size:.95rem;font-weight:800;color:var(--sand);line-height:1.2}
    .chat-ctx-name{
      margin:.15rem 0 0;font-size:.78rem;font-weight:700;color:var(--sea);
      text-decoration:none;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
    }
    .chat-ctx-name:hover{text-decoration:underline}
    .chat-invite-mini{
      display:flex;align-items:center;gap:.4rem;flex:0 0 auto;
    }
    .chat-invite-mini .chat-invite-link{
      display:none;
    }
    .chat-invite-copy{
      padding:.4rem .55rem;border-radius:10px;border:1px solid rgba(94,228,168,.45);
      background:rgba(94,228,168,.14);color:#ecfdf5;font:inherit;font-size:.68rem;font-weight:800;cursor:pointer;
    }
    .chat-invite-copy.is-ok{background:rgba(94,228,168,.4);color:#031016}

    .chat-sheet-body{
      flex:1;min-height:0;display:flex;flex-direction:column;
      overflow:hidden;position:relative;
    }
    .chat-thread{
      flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;
      padding:1rem 1.1rem;display:flex;flex-direction:column;gap:.45rem;
      background:#0d1c24;
    }
    .chat-empty{
      margin:auto;padding:2rem 1rem;text-align:center;
      font-size:.95rem;color:#7a8f9a;font-weight:600;
    }
    .chat-empty[hidden],.chat-thread.has-msgs .chat-empty{display:none!important}
    .chat-bubble{
      max-width:78%;padding:.55rem .75rem;border-radius:14px;font-size:.82rem;line-height:1.4;
    }
    .chat-bubble.sys{
      align-self:center;max-width:90%;background:rgba(62,207,207,.1);color:#bae6fd;
      border:1px solid rgba(62,207,207,.25);font-size:.72rem;text-align:center;border-radius:999px;
    }
    .chat-bubble.me{
      align-self:flex-end;background:rgba(62,207,207,.2);border:1px solid rgba(62,207,207,.35);
      color:var(--text);border-bottom-right-radius:4px;white-space:pre-wrap;
    }
    .chat-bubble.bot{
      align-self:flex-start;background:#17232d;border:1px solid var(--line);
      color:var(--text);border-bottom-left-radius:4px;
    }
    .chat-bubble.file{
      align-self:flex-end;max-width:88%;padding:.65rem .75rem;
      background:linear-gradient(135deg,rgba(251,191,36,.16),rgba(62,207,207,.14));
      border:1px solid rgba(251,191,36,.45);border-radius:14px;border-bottom-right-radius:4px;
    }
    .chat-file-card{display:flex;align-items:flex-start;gap:.55rem}
    .chat-file-ico{
      flex:0 0 auto;width:36px;height:36px;border-radius:10px;
      display:grid;place-items:center;font-size:1.1rem;
      background:rgba(251,191,36,.2);border:1px solid rgba(251,191,36,.4);
    }
    .chat-file-meta{min-width:0;flex:1}
    .chat-file-meta b{display:block;font-size:.78rem;font-weight:800;color:var(--sand);line-height:1.25}
    .chat-file-meta span{display:block;font-size:.68rem;color:var(--muted);margin-top:2px;line-height:1.3}
    .chat-file-dl{
      margin-top:.45rem;padding:.35rem .65rem;border-radius:999px;
      border:1px solid rgba(94,228,168,.5);background:rgba(94,228,168,.16);
      color:#ecfdf5;font:inherit;font-size:.68rem;font-weight:800;cursor:pointer;
    }
    .chat-file-dl:hover{background:rgba(94,228,168,.28)}

    .chat-compose{
      flex:0 0 auto;padding:.55rem .9rem calc(.75rem + var(--safe));
      border-top:1px solid var(--line);background:#0a141c;
    }
    .chat-nego-bar{display:flex;flex-wrap:wrap;gap:.35rem;margin:0 0 .45rem}
    .chat-nego-chip{
      display:inline-flex;align-items:center;gap:.35rem;
      border:1px solid rgba(251,191,36,.5);background:rgba(251,191,36,.12);
      color:#fde68a;border-radius:999px;padding:.4rem .75rem;
      font:inherit;font-size:.74rem;font-weight:800;cursor:pointer;line-height:1.2;
    }
    .chat-nego-chip:hover{background:rgba(251,191,36,.22);border-color:rgba(251,191,36,.7)}
    .chat-nego-chip.is-sent{opacity:.55}
    .chat-starters{
      display:flex;flex-wrap:wrap;gap:.4rem;margin:0 0 .55rem;
      justify-content:flex-start;
    }
    .chat-starter{
      border:1px solid rgba(62,207,207,.35);background:rgba(62,207,207,.08);
      color:var(--sea);border-radius:999px;padding:.4rem .75rem;
      font:inherit;font-size:.78rem;font-weight:700;cursor:pointer;line-height:1.2;
    }
    .chat-starter:hover{background:rgba(62,207,207,.16);border-color:rgba(62,207,207,.55)}
    .chat-starter.is-used{opacity:.4;pointer-events:none}
    .chat-input-row{
      display:flex;align-items:center;gap:.45rem;
      padding:.35rem .45rem .35rem .7rem;border-radius:999px;
      background:#132029;border:1px solid var(--line);
    }
    .chat-attach{
      flex:0 0 auto;width:36px;height:36px;border-radius:50%;
      border:1px solid rgba(251,191,36,.45);background:rgba(251,191,36,.12);
      color:#fde68a;font:inherit;font-size:1rem;cursor:pointer;
      display:grid;place-items:center;line-height:1;
    }
    .chat-attach:hover{background:rgba(251,191,36,.22)}
    .chat-input{
      flex:1;min-width:0;border:0;background:transparent;color:var(--text);
      font:inherit;font-size:.88rem;padding:.45rem 0;outline:none;
    }
    .chat-input::placeholder{color:#6b8190}
    .chat-send{
      flex:0 0 auto;width:40px;height:40px;border-radius:50%;
      border:0;background:var(--sea);color:#031016;font:inherit;font-weight:900;
      font-size:1rem;cursor:pointer;display:grid;place-items:center;
    }
    .chat-send:disabled{opacity:.35;cursor:default}
    .chat-wa-link{
      display:inline-flex;align-items:center;justify-content:center;
      margin-top:.45rem;font-size:.72rem;font-weight:700;color:var(--muted);text-decoration:none;
    }
    .chat-wa-link:hover{color:var(--sea)}

    body.chat-open{overflow:hidden}
    .swipe-chat-wrap--card{display:none!important}
    .swipe-chat-wrap--desk{display:flex}
    .swipe-chat-wrap--desk.is-continue{padding-top:8px;padding-bottom:calc(8px + var(--safe))}
    .swipe-chat-wrap--desk.is-continue .swipe-chat{display:none!important}
    .swipe-chat-wrap--dock{display:none!important}
    .chat-continue-btn{
      width:100%; min-height:48px; padding:0 16px; border-radius:999px; border:0;
      display:inline-flex; align-items:center; justify-content:center; gap:10px;
      font:inherit; font-weight:800; font-size:.88rem; letter-spacing:.01em;
      color:#031016; cursor:pointer; -webkit-tap-highlight-color:transparent;
      background:linear-gradient(105deg,#3ecfcf 0%,#2bb3b3 45%,#d8c3a5 100%);
      box-shadow:0 10px 28px rgba(62,207,207,.28),0 4px 12px rgba(0,0,0,.3);
    }
    .chat-continue-btn:hover{filter:brightness(1.05)}
    .chat-continue-btn:focus-visible{outline:2px solid var(--sea); outline-offset:3px}
    .chat-continue-btn.has-incoming{
      background:linear-gradient(105deg,#ff8a8a 0%,#fcd34d 100%);
      box-shadow:0 10px 28px rgba(255,92,92,.28),0 4px 12px rgba(0,0,0,.3);
    }
    .chat-continue-badge{
      display:none; min-width:22px; height:22px; padding:0 7px; border-radius:999px;
      align-items:center; justify-content:center;
      background:#ff5c5c; color:#fff; font-size:11px; font-weight:800; line-height:1;
      border:2px solid rgba(3,16,22,.35);
    }
    .chat-continue-btn.has-incoming .chat-continue-badge{display:inline-flex!important}
    .chat-continue-incoming{
      display:none; font-size:.72rem; font-weight:800; opacity:.92; white-space:nowrap;
    }
    .chat-continue-btn.has-incoming .chat-continue-incoming{display:inline!important}
    .mob-broker-dock-thread{display:none!important}

    @media (max-width:1100px){
      .swipe-chat-wrap--card{display:none!important}
      .swipe-chat-wrap--desk{display:none!important}
      .swipe-chat-wrap--dock{display:flex!important}
      .act-opts{display:none!important}
      .mob-broker-dock{
        display:flex;flex-direction:column;gap:8px;
        position:fixed;left:0;right:0;bottom:0;z-index:35;
        padding:10px 12px calc(10px + var(--safe));
        background:linear-gradient(180deg,rgba(7,19,26,.2),rgba(7,19,26,.96) 22%,#07131a);
        border-top:1px solid var(--line);
        box-shadow:0 -14px 40px rgba(0,0,0,.5);
      }
      body.detail-open .mob-broker-dock,
      body.chat-open .mob-broker-dock{display:none!important}
      .longread{padding-bottom:calc(100px + var(--safe))!important}
      body.detail-open .detail{min-height:0;max-height:78vh}
      .swipe-chat{height:50px}
      .swipe-chat-thumb{height:42px;width:52px;top:4px}
      .swipe-chat-label{font-size:.78rem;padding-left:52px;padding-right:36px}

      /* mobile fullscreen + micro object rail */
      .chat-sheet{
        background:#0d1c24;backdrop-filter:none;
        align-items:stretch;justify-content:stretch;
      }
      .chat-sheet-panel{
        width:100%;height:100%;max-height:100%;
        border:none;box-shadow:none;animation:chatSheetUp .26s ease;
      }
      .chat-rail{
        flex:0 0 72px;width:72px;
      }
      .chat-list-head{display:none}
      .chat-list-body{padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:8px}
      .chat-list-empty{display:none}
      .chat-list-row{
        display:flex;flex-direction:column;align-items:center;gap:4px;
        width:64px;padding:4px;grid-template-columns:unset;border:1px solid transparent;border-radius:14px;
      }
      .chat-list-row.is-on{border-color:rgba(62,207,207,.5)}
      .chat-list-thumb{width:44px;height:44px;border-radius:12px}
      .chat-list-main{width:100%;text-align:center}
      .chat-list-title{
        display:block;font-size:9px;font-weight:800;margin:0;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      }
      .chat-list-title .dot{display:none}
      .chat-list-sub{
        font-size:8px;white-space:normal;line-height:1.15;
        display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
      }
      .chat-list-snip,.chat-list-time{display:none}
      .chat-conv-head{padding:.65rem .7rem}
      .chat-ctx{padding:.5rem .7rem;gap:.5rem}
      .chat-ctx-thumb{width:40px;height:40px}
      .chat-compose{padding:.45rem .65rem calc(.65rem + var(--safe))}
      .chat-thread{padding:.75rem}
      .chat-starter{font-size:.72rem;padding:.35rem .6rem}
    }
  `;
}

function swipeStartChatDockHtml() {
  return `
  <aside class="mob-broker-dock" id="mobBrokerDock" aria-label="Начать чат с брокером">
    <div class="mob-broker-dock-thread" id="mobBrokerDockThread" aria-live="polite" hidden></div>
    <div id="mobBrokerDockSwipe"></div>
  </aside>`;
}

function swipeStartChatSheetHtml() {
  return `
  <div class="chat-sheet" id="chatSheet" aria-hidden="true">
    <div class="chat-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="chatSheetTitle">
      <div class="chat-sheet-layout">
        <aside class="chat-rail" id="chatRail" aria-label="Чаты по объектам">
          <div class="chat-list-head">
            <button type="button" class="chat-sheet-x" id="chatSheetClose" aria-label="Закрыть">✕</button>
            <h2 id="chatSheetTitle">Сообщения</h2>
          </div>
          <div class="chat-list-body" id="chatListBody">
            <p class="chat-list-empty">Откройте лот и начните чат с брокером</p>
          </div>
        </aside>
        <div class="chat-sheet-main">
          <div class="chat-conv-head">
            <div class="chat-conv-avatar" id="chatConvAvatar">R</div>
            <div class="chat-conv-who">
              <b id="chatConvName">Брокер</b>
              <span id="chatConvStatus">offline</span>
              <span class="chat-conv-hint" id="chatConvHint">Пригласили в чат · ожидаем · пока можете задать вопросы</span>
            </div>
            <button type="button" class="chat-conv-menu" id="chatSheetCloseMob" aria-label="Закрыть" title="Закрыть">✕</button>
          </div>
          <div class="chat-ctx" id="chatCtxBar">
            <div class="chat-ctx-thumb" id="chatCtxThumb"><span class="ph">·</span></div>
            <div class="chat-ctx-meta">
              <p class="chat-ctx-price" id="chatCtxPrice">—</p>
              <a class="chat-ctx-name" id="chatCtxName" href="#" target="_blank" rel="noopener">Объект</a>
            </div>
            <div class="chat-invite-mini">
              <div class="chat-invite-link" id="chatBrokerJoinUrl" hidden></div>
              <button type="button" class="chat-invite-copy" id="chatBrokerJoinCopy" title="Скопировать B2B-ссылку для брокера">Invite</button>
            </div>
          </div>
          <div class="chat-sheet-body">
            <div class="chat-thread" id="chatThread" aria-live="polite">
              <p class="chat-empty" id="chatEmpty">В этом чате еще нет сообщений</p>
            </div>
          </div>
          <div class="chat-compose">
            <div class="chat-nego-bar">
              <button type="button" class="chat-nego-chip" id="chatNegoFileBtn" title="Отчёт vs comps · AED/sqft · история · DOM — для переговоров с брокером">📎 Отправить отчёт для переговоров</button>
            </div>
            <div class="chat-starters" id="chatStarters"></div>
            <form class="chat-input-row" id="chatInputForm" autocomplete="off">
              <button type="button" class="chat-attach" id="chatAttachBtn" aria-label="Прикрепить анализ для переговоров" title="Файл для переговоров">📎</button>
              <input class="chat-input" id="chatInput" type="text" placeholder="Напишите сообщение..." maxlength="2000" />
              <button type="submit" class="chat-send" id="chatSend" aria-label="Отправить">↑</button>
            </form>
            <a class="chat-wa-link" id="chatWaLink" href="#" target="_blank" rel="noopener">Открыть в WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

module.exports = { swipeStartChatCss, swipeStartChatSheetHtml, swipeStartChatDockHtml };
