(() => {
  'use strict';

  const APP_VERSION = 'v0.5.0';
  const STATUS_URL = './public-status.json';
  const VALID_TABS = new Set(['command','strategy','evidence','performance','ai']);
  let state = null;

  const $ = (id) => document.getElementById(id);
  const text = (id, value) => { const el=$(id); if(el) el.textContent = value ?? '—'; };
  const shortSha = (value) => value && value.length > 12 ? value.slice(0,12) : (value || '—');

  function required(obj, path) {
    let cur=obj;
    for (const key of path.split('.')) {
      if (!cur || !Object.prototype.hasOwnProperty.call(cur,key)) throw new Error(`missing:${path}`);
      cur=cur[key];
    }
    return cur;
  }

  function validateStatus(data) {
    required(data,'schema_version');
    required(data,'release_channel');
    required(data,'snapshot_generated_at_jst');
    required(data,'source.repository');
    required(data,'source.branch');
    required(data,'source.main_sha');
    required(data,'source.main_commit_at_jst');
    required(data,'canonical.version');
    required(data,'canonical.source_sha256');
    required(data,'strategy_track.last_formal_proof');
    required(data,'strategy_track.last_formal_result');
    required(data,'strategy_track.status');
    required(data,'strategy_track.next_gate');
    required(data,'strategy_track.runtime_authorized');
    required(data,'implementation_gate.status');
    required(data,'implementation_gate.source_implementation_authorized');
    required(data,'implementation_gate.next_version_label');
    required(data,'performance.published');
    required(data,'performance.status');
    required(data,'safety.fail_closed');
    required(data,'safety.real_money');
    required(data,'safety.live_trade_control');
    required(data,'safety.canonical_frozen_auto_edit');
    required(data,'safety.command_center_trade_api');
    required(data,'safety.private_evidence_exposed');
    required(data,'safety.credentials_exposed');

    if (data.schema_version !== 'public-0.2') throw new Error('schema_version_invalid');
    if (data.release_channel !== 'v0.5.0-rc1') throw new Error('release_channel_invalid');
    if (data.source.repository !== 'poketaro1930katsu-sys/orz-ea-development') throw new Error('source_repository_invalid');
    if (data.source.branch !== 'main') throw new Error('source_branch_invalid');
    if (!/^[0-9a-f]{40}$/.test(data.source.main_sha)) throw new Error('source_main_sha_invalid');
    if (!/^[0-9A-F]{64}$/.test(data.canonical.source_sha256)) throw new Error('canonical_sha256_invalid');
    if (data.performance.published !== false || data.performance.status !== 'UNVERIFIED_NOT_PUBLISHED') throw new Error('performance_publication_boundary_invalid');
    if (data.safety.fail_closed !== true) throw new Error('fail_closed_must_be_true');
    if (data.safety.real_money !== 'PROHIBITED') throw new Error('real_money_boundary_invalid');
    if (data.safety.live_trade_control !== 'NOT_PRESENT_IN_COMMAND_CENTER') throw new Error('live_trade_boundary_invalid');
    if (data.safety.canonical_frozen_auto_edit !== 'BLOCKED') throw new Error('canonical_boundary_invalid');
    if (data.safety.command_center_trade_api !== 'NONE') throw new Error('trade_api_boundary_invalid');
    if (data.safety.private_evidence_exposed !== false) throw new Error('private_evidence_boundary_invalid');
    if (data.safety.credentials_exposed !== false) throw new Error('credentials_boundary_invalid');
    if (data.strategy_track.runtime_authorized !== false) throw new Error('strategy_runtime_must_be_false');
    if (data.implementation_gate.source_implementation_authorized !== false) throw new Error('source_implementation_must_be_false');
    return data;
  }

  function freshness(iso) {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return {label:'UNKNOWN', detail:'Snapshot検証時刻を解釈できません', level:'error'};
    const ageMs = Date.now()-t;
    if (ageMs < -10*60*1000) return {label:'FUTURE', detail:'Snapshot検証時刻が現在時刻より10分超先です — 正常なSnapshotとはみなしません', level:'error'};
    const hours = Math.max(0,ageMs/36e5);
    if (hours <= 24) return {label:'FRESH', detail:`Snapshot検証から約${Math.floor(hours)}時間`, level:'ready'};
    if (hours <= 72) return {label:'AGING', detail:`Snapshot検証から約${Math.floor(hours)}時間`, level:'warning'};
    return {label:'STALE', detail:`Snapshot検証から約${Math.floor(hours)}時間 — 最新状態とはみなしません`, level:'error'};
  }

  function setBanner(level,title,meta) {
    const b=$('systemBanner');
    b.className=`system-banner ${level}`;
    text('systemBannerTitle',title); text('systemBannerMeta',meta);
  }

  function render(data) {
    const f=freshness(data.snapshot_generated_at_jst);
    if (f.level === 'error') {
      enterFailClosed(`PUBLIC_SNAPSHOT_${f.label}: ${f.detail}`);
      return;
    }

    state=data;
    document.body.classList.remove('fail-closed');
    document.querySelectorAll('[data-release]').forEach(el=>el.textContent=data.release_channel);

    text('heroHealth', f.level === 'warning' ? 'Repository Evidence 読込済み / Snapshot aging' : 'Repository Evidence 読込済み');
    text('canonicalVersion', `v${data.canonical.version}`);
    text('strategyProof', `${data.strategy_track.last_formal_proof} / ${data.strategy_track.last_formal_result}`);
    text('nextGate', `${data.strategy_track.next_gate} / ${data.strategy_track.status}`);
    text('canonicalMetric', `v${data.canonical.version}`);
    text('canonicalMeta', `property ${data.canonical.property_version || '—'} / ${shortSha(data.canonical.source_sha256)}`);
    text('proofMetric', data.strategy_track.last_formal_proof);
    text('proofMeta', `正式結果: ${data.strategy_track.last_formal_result}`);
    text('planningMetric', data.implementation_gate.status_short || 'LOCKED');
    text('planningMeta', data.implementation_gate.status);
    text('freshnessMetric', f.label);
    text('freshnessMeta', f.detail);
    text('nextActionTitle', data.strategy_track.next_gate);
    text('nextActionText', data.strategy_track.next_gate_note);
    text('strategyLine', `${data.strategy_track.development_line} / ${data.strategy_track.last_formal_proof}`);
    text('strategySummary', data.strategy_track.summary);
    fillList('confirmedList', data.strategy_track.confirmed || []);
    fillList('blockedList', data.strategy_track.not_authorized || []);
    text('gp014bRuntime', data.strategy_track.runtime_authorized ? '許可' : '未許可');
    text('sourceImplementation', data.implementation_gate.source_implementation_authorized ? '許可' : '未許可');
    text('nextVersionLabel', data.implementation_gate.next_version_label);
    text('evidenceResult', `${data.strategy_track.last_formal_proof} / ${data.strategy_track.last_formal_result}`);
    text('sourceRepo', data.source.repository);
    text('sourceMainSha', data.source.main_sha);
    text('canonicalSha', data.canonical.source_sha256);
    text('evidenceCanonical', `v${data.canonical.version}`);
    text('evidenceStrategyProof', `${data.strategy_track.last_formal_proof} / ${data.strategy_track.last_formal_result}`);
    text('sourceObserved', data.source.main_commit_at_jst);
    $('sourceObserved').dateTime=data.source.main_commit_at_jst;
    text('publicNotice', data.public_notice);
    text('performanceTitle', data.performance.published ? '公開検証成績' : '検証済み公開成績は未掲載');
    text('performanceText', data.performance.message);
    text('performanceStatus', data.performance.status);
    renderAi('next');

    setBanner(
      f.level,
      f.level === 'warning' ? 'Repository Evidence 読込完了 / Snapshot aging' : 'Repository Evidence 読込完了',
      `${data.release_channel} / ${f.label}`
    );
  }

  function fillList(id, items) {
    const ul=$(id); ul.replaceChildren();
    for (const item of items) {
      const li=document.createElement('li');
      li.textContent=item;
      ul.appendChild(li);
    }
    if (!items.length) {
      const li=document.createElement('li'); li.textContent='公開項目なし'; ul.appendChild(li);
    }
  }

  function renderAi(question) {
    if (!state) {
      text('aiHeadline','公開Evidenceを読み込み中');
      text('aiAnswer','状態取得後に案内します。');
      return;
    }
    const answers={
      next:{h:`次のGateは ${state.strategy_track.next_gate}`,a:state.strategy_track.next_gate_note},
      why:{h:'止まっているのは不具合ではなく安全Gate',a:`${state.strategy_track.next_gate} runtime と Source implementation は未許可です。Evidenceが揃っても、実行権限や本番判断は別のHuman Decisionです。`},
      safe:{h:'安全境界は変更されていません',a:'FAIL-CLOSED、リアルマネー禁止、Live Trade Control未搭載、Canonical/Frozen自動変更禁止。本アプリ自体は注文を送信できません。'},
      evidence:{h:`Authorityは ${state.source.repository}`,a:`Source main ${shortSha(state.source.main_sha)} と Canonical v${state.canonical.version} / SHA256 ${shortSha(state.canonical.source_sha256)} を公開Snapshotの根拠として表示しています。`}
    };
    const out=answers[question] || answers.next;
    text('aiHeadline',out.h); text('aiAnswer',out.a);
  }

  function enterFailClosed(reason) {
    state=null;
    document.body.classList.add('fail-closed');
    document.querySelectorAll('[data-release]').forEach(el=>el.textContent='UNKNOWN');
    setBanner('error','STATUS UNKNOWN — FAIL-CLOSED','公開Evidenceを検証できません');
    text('heroHealth','Evidence取得失敗 — 未確認をPASS扱いしません');
    const unknownIds=['canonicalVersion','strategyProof','nextGate','canonicalMetric','proofMetric','planningMetric','freshnessMetric',
      'proofMeta','planningMeta','freshnessMeta','gp014bRuntime','sourceImplementation','nextVersionLabel','evidenceResult',
      'sourceRepo','sourceMainSha','canonicalSha','evidenceCanonical','evidenceStrategyProof','sourceObserved'];
    unknownIds.forEach(id=>text(id,'UNKNOWN'));
    if ($('sourceObserved')) $('sourceObserved').dateTime='';
    text('canonicalMeta','Repository Evidence 未確認');
    text('nextActionTitle','STOP / VERIFY');
    text('nextActionText','公開状態を検証できないため、次工程へは進みません。');
    text('strategyLine','UNKNOWN');
    text('strategySummary','Evidence取得またはschema検証に失敗しました。');
    fillList('confirmedList',[]);
    fillList('blockedList',['未確認状態からの自動昇格','Runtime / Trade / Real money']);
    text('performanceTitle','成績表示停止');
    text('performanceText','Evidence未確認のため数値を表示しません。');
    text('performanceStatus','UNKNOWN');
    text('publicNotice',`Fail-Closed reason: ${reason}`);
    text('aiHeadline','Fail-Closed');
    text('aiAnswer','公開Evidenceを検証できないため、AI案内は安全境界以外の判断を行いません。');
  }

  async function loadStatus() {
    setBanner('loading','公開Evidenceを確認中','READ-ONLY / FAIL-CLOSED');
    try {
      const url=`${STATUS_URL}?v=${encodeURIComponent(APP_VERSION)}&t=${Date.now()}`;
      const res=await fetch(url,{cache:'no-store',headers:{'Accept':'application/json'}});
      if(!res.ok) throw new Error(`HTTP_${res.status}`);
      const data=validateStatus(await res.json());
      render(data);
    } catch (err) {
      console.error('public status validation failed',err);
      enterFailClosed(err?.message || 'UNKNOWN_ERROR');
    }
  }

  function activateTab(name, updateHash=true) {
    if(!VALID_TABS.has(name)) name='command';
    document.querySelectorAll('.view').forEach(v=>{
      const active=v.dataset.view===name;
      v.hidden=!active; v.classList.toggle('active',active);
    });
    document.querySelectorAll('.tab').forEach(b=>{
      const active=b.dataset.tab===name;
      b.classList.toggle('active',active);
      if(active) b.setAttribute('aria-current','page');
      else b.removeAttribute('aria-current');
    });
    if(updateHash && location.hash !== `#${name}`) history.replaceState(null,'',`#${name}`);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function bindUi() {
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>activateTab(btn.dataset.tab)));
    document.querySelectorAll('[data-ai-question]').forEach(btn=>btn.addEventListener('click',()=>renderAi(btn.dataset.aiQuestion)));
    $('refreshButton').addEventListener('click',loadStatus);
    $('showcaseButton').addEventListener('click',()=>{
      const on=document.body.classList.toggle('showcase');
      $('showcaseButton').setAttribute('aria-pressed',String(on));
      $('showcaseButton').textContent=on?'公開表示 ON':'公開表示';
    });
    window.addEventListener('hashchange',()=>activateTab(location.hash.slice(1),false));
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;
    const iOS=/iPhone|iPad|iPod/.test(navigator.userAgent);
    if(iOS && !standalone) $('installHelp').hidden=false;
    if('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('service worker',err));
    }
    activateTab(location.hash.slice(1) || 'command',false);
  }

  document.addEventListener('DOMContentLoaded',()=>{bindUi();loadStatus();});
})();
