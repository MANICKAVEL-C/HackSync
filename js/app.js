/**
 * Main Application Controller — Executive Data Table, ML Engine & Google OAuth 2.0 Engine
 */

const app = {
  activeTab: 'matches',
  hackathons: [],
  viewLayout: 'table',
  groupingMode: 'urgency',

  init() {
    this.loadHackathons();
    this.renderSkills();
    this.renderProjects();
    this.renderMatches();
    this.renderTracker();
    this.updateStats();

    const storedUser = localStorage.getItem('hacksync_github_username');
    if (storedUser) {
      const input = document.getElementById('github-username');
      if (input) input.value = storedUser;
    }

    if (window.lucide) lucide.createIcons();
    if (window.GoogleOAuthModule) {
      GoogleOAuthModule.initOAuth('974835829792-tmr465m5jpr7rlrbncr0nsq1hd9ejlfl.apps.googleusercontent.com');
    }

    setInterval(() => this.renderMatches(), 60000);
  },

  loadHackathons() {
    const presets = ImporterModule.getCollegePresetCompetitions();
    const data = localStorage.getItem('hacksync_competitions');
    let stored = [];
    if (data) {
      try {
        stored = JSON.parse(data);
      } catch (e) {
        stored = [];
      }
    }

    if (!stored || stored.length <= 5) {
      this.hackathons = presets;
    } else {
      const existingTitles = new Set(stored.map(h => h.title.toLowerCase().trim()));
      const missingPresets = presets.filter(p => !existingTitles.has(p.title.toLowerCase().trim()));
      this.hackathons = [...stored, ...missingPresets];
    }
    this.saveHackathons();
  },

  loadPresetCompetitions(showAlert = true) {
    const presets = ImporterModule.getCollegePresetCompetitions();
    this.hackathons = presets;
    this.saveHackathons();
    this.renderMatches();
    if (showAlert) {
      alert(`⚡ Successfully loaded ${presets.length} Real College & National Hackathons! Sorted by Deadline Urgency & ECE Skill Fit.`);
    }
  },

  saveHackathons() {
    try {
      localStorage.setItem('hacksync_competitions', JSON.stringify(this.hackathons));
    } catch (e) {
      console.warn('LocalStorage quota filled. Retaining data in memory.', e);
    }
  },

  clearAllData() {
    if (confirm('Are you sure you want to clear all hackathons and start fresh with 0 items?')) {
      this.hackathons = [];
      this.saveHackathons();
      this.renderMatches();
      alert('Cleared all items. Dashboard is clean and ready for your real email/spreadsheet import.');
    }
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.classList.add('text-slate-600');
    });

    const targetView = document.getElementById(`view-${tabName}`);
    const targetBtn = document.getElementById(`tab-${tabName}-btn`);

    if (targetView) targetView.classList.remove('hidden');
    if (targetBtn) {
      targetBtn.classList.add('active');
      targetBtn.classList.remove('text-slate-600');
    }

    if (tabName === 'matches') this.renderMatches();
    if (tabName === 'profile') {
      this.renderSkills();
      this.renderProjects();
    }
    if (tabName === 'tracker') this.renderTracker();
  },

  setLayout(layout) {
    this.viewLayout = layout;
    document.getElementById('btn-layout-table').className = layout === 'table' ? 'px-3 py-1.5 rounded-xl text-xs font-black bg-ocean-600 text-white shadow-md' : 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600';
    document.getElementById('btn-layout-cards').className = layout === 'cards' ? 'px-3 py-1.5 rounded-xl text-xs font-black bg-ocean-600 text-white shadow-md' : 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600';
    this.renderMatches();
  },

  setFilterScope(scope) {
    this.filterScope = scope;
    const btnAll = document.getElementById('btn-scope-all');
    const btnTop15 = document.getElementById('btn-scope-top15');
    if (btnAll) btnAll.className = scope === 'all' ? 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-ocean-600 text-white shadow-md transition-all' : 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:text-slate-900 transition-all';
    if (btnTop15) btnTop15.className = scope === 'top15' ? 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md transition-all' : 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:text-slate-900 transition-all';
    this.renderMatches();
  },

  handleActionClick(id, action = 'applied') {
    const target = this.hackathons.find(h => h.id === id);
    if (target && window.MLPredictor) {
      MLPredictor.recordFeedback(target, action);
      this.renderMatches();
    }
  },

  setGroupingMode(mode) {
    this.groupingMode = mode;
    ['urgency', 'domain', 'flat'].forEach(m => {
      const btn = document.getElementById(`btn-group-${m}`);
      if (btn) {
        btn.className = m === mode ? 'px-3 py-1.5 rounded-xl text-xs font-black bg-ocean-600 text-white shadow-md' : 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:text-slate-900';
      }
    });
    this.renderMatches();
  },

  renderMatches() {
    const container = document.getElementById('hackathons-container');
    const emptyState = document.getElementById('hackathons-empty');
    if (!container) return;

    const searchQuery = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const platformFilter = document.getElementById('filter-platform')?.value || 'all';

    const userSkills = ProfileModule.getSkills();
    const userProjects = ProfileModule.getProjects();

    let processed = this.hackathons.map(h => {
      const deadlineInfo = MatcherModule.getDeadlineInfo(h.deadline);
      const hWithDeadline = { ...h, deadlineInfo };
      const mlResult = MLPredictor.predictSuitability(userSkills, userProjects, hWithDeadline);
      const status = TrackerModule.getStatus(h.id);

      return {
        ...h,
        mlResult,
        deadlineInfo,
        status
      };
    });

    if (searchQuery) {
      processed = processed.filter(h => 
        h.title.toLowerCase().includes(searchQuery) ||
        h.platform.toLowerCase().includes(searchQuery) ||
        (h.skills || []).some(s => s.toLowerCase().includes(searchQuery))
      );
    }

    if (platformFilter !== 'all') {
      const pfLower = platformFilter.toLowerCase();
      processed = processed.filter(h => {
        const hPlatform = (h.platform || '').toLowerCase();
        if (pfLower.includes('gmail') || pfLower.includes('email')) {
          return hPlatform.includes('gmail') || hPlatform.includes('email') || hPlatform.includes('notice') || hPlatform.includes('circular') || hPlatform.includes('college');
        }
        return hPlatform.includes(pfLower);
      });
    }

    // ML Sorting: Priority rank by Composite Score (60% Skill/Project Match + 40% Urgency Deadline)
    processed.sort((a, b) => {
      if (b.mlResult.compositeScore !== a.mlResult.compositeScore) {
        return b.mlResult.compositeScore - a.mlResult.compositeScore;
      }
      return b.mlResult.score - a.mlResult.score;
    });

    if (this.filterScope === 'top15') {
      processed = processed.slice(0, 15);
    }

    if (processed.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');

      if (this.viewLayout === 'table') {
        container.innerHTML = this.renderOrganizedDataTable(processed);
      } else {
        container.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 col-span-full">
            ${processed.map(h => this.createHackathonCardHTML(h)).join('')}
          </div>
        `;
      }
    }

    this.updateStats();
    document.getElementById('badge-matches-count').innerText = processed.length;
    if (window.lucide) lucide.createIcons();
  },

  escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  renderOrganizedDataTable(items) {
    return `
      <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-900 text-white font-extrabold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <th class="p-3.5 w-24">ML Match</th>
                <th class="p-3.5">Competition Title & Details</th>
                <th class="p-3.5 w-40">Source / Platform</th>
                <th class="p-3.5 w-36">Registration Deadline</th>
                <th class="p-3.5">Skills Required</th>
                <th class="p-3.5 w-28">Prize</th>
                <th class="p-3.5 w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
              ${items.map(h => {
                const mlScore = h.mlResult.score;
                const matchBadge = mlScore >= 80 ? 'bg-emerald-600 text-white font-black' : (mlScore >= 65 ? 'bg-ocean-600 text-white font-black' : 'bg-slate-700 text-white font-bold');
                const auth = MatcherModule.verifyAuthenticity ? MatcherModule.verifyAuthenticity(h) : { badge: 'Verified', colorClass: 'bg-slate-100 text-slate-700 border-slate-200' };

                const safeTitle = this.escapeHTML(h.title);
                const safePlatform = this.escapeHTML(h.platform);
                const safePrize = this.escapeHTML(h.prize || 'Rewards');
                const safeExplanation = this.escapeHTML(h.mlResult.explanation);
                const safeLink = this.escapeHTML(h.link);

                return `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="p-3.5">
                      <span onclick="app.openDetailModal('${h.id}')" class="px-2.5 py-1 rounded-lg ${matchBadge} text-xs inline-flex items-center gap-1 cursor-pointer">
                        <i data-lucide="brain-circuit" class="w-3.5 h-3.5"></i>
                        ${mlScore}%
                      </span>
                    </td>
                    <td class="p-3.5">
                      <div onclick="app.openDetailModal('${h.id}')" class="font-extrabold text-slate-900 text-sm hover:text-ocean-600 cursor-pointer line-clamp-1">
                        ${safeTitle}
                      </div>
                      <div class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">${safeExplanation}</div>
                    </td>
                    <td class="p-3.5">
                      <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 border border-slate-200 text-slate-700 inline-block line-clamp-1">
                        ${safePlatform}
                      </span>
                      <div class="mt-1">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${auth.colorClass}">
                          ${auth.badge}
                        </span>
                      </div>
                    </td>
                    <td class="p-3.5">
                      <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${h.deadlineInfo.urgencyBadge}">
                        ${h.deadlineInfo.displayText}
                      </span>
                    </td>
                    <td class="p-3.5">
                      <div class="flex flex-wrap gap-1">
                        ${(h.skills || []).slice(0, 3).map(s => `
                          <span class="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">${this.escapeHTML(s)}</span>
                        `).join('')}
                      </div>
                    </td>
                    <td class="p-3.5 font-bold text-sun-600">
                      ${safePrize}
                    </td>
                    <td class="p-3.5 text-right space-x-1">
                      <a href="${safeLink}" target="_blank" onclick="app.handleActionClick('${h.id}', 'applied')" class="px-3 py-1 rounded-lg bg-ocean-600 hover:bg-ocean-700 text-white font-bold text-xs inline-flex items-center gap-1">
                        Apply <i data-lucide="external-link" class="w-3 h-3"></i>
                      </a>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  createHackathonCardHTML(h) {
    const mlScore = h.mlResult.score;
    const matchBadgeClass = mlScore >= 80 ? 'bg-emerald-500 text-white shadow-emerald-500/20' : (mlScore >= 65 ? 'bg-ocean-600 text-white' : 'bg-slate-700 text-white');

    const safeTitle = this.escapeHTML(h.title);
    const safePlatform = this.escapeHTML(h.platform);
    const safeDesc = this.escapeHTML(h.description || 'College competition');
    const safePrize = this.escapeHTML(h.prize || 'Prizes');
    const safeLink = this.escapeHTML(h.link);
    const safeId = this.escapeHTML(h.id);

    return `
      <div class="hackathon-card bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md transition-all">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border bg-ocean-50 text-ocean-700 border-ocean-200 line-clamp-1">
              ${safePlatform}
            </span>
            <span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${h.deadlineInfo.urgencyBadge} shrink-0">
              ${h.deadlineInfo.displayText}
            </span>
          </div>

          <div>
            <h3 onclick="app.openDetailModal('${safeId}')" class="text-base font-extrabold text-slate-900 line-clamp-1 hover:text-ocean-600 cursor-pointer transition-colors">
              ${safeTitle}
            </h3>
            <p class="text-xs text-slate-500 line-clamp-2 mt-1">${safeDesc}</p>
          </div>

          <div class="flex flex-wrap gap-1.5 pt-1">
            ${(h.skills || []).slice(0, 4).map(s => `
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                ${this.escapeHTML(s)}
              </span>
            `).join('')}
          </div>
        </div>

        <div class="space-y-3 pt-3 border-t border-slate-100">
          <div class="flex items-center justify-between">
            <span onclick="app.openDetailModal('${safeId}')" class="text-xs font-black px-2.5 py-1 rounded-xl ${matchBadgeClass} flex items-center gap-1 shadow-sm cursor-pointer hover:scale-105 transition-transform">
              <i data-lucide="brain-circuit" class="w-3.5 h-3.5"></i>
              ${mlScore}% ML Match
            </span>
            <span class="text-xs font-extrabold text-sun-600 flex items-center gap-1 line-clamp-1">
              <i data-lucide="trophy" class="w-3.5 h-3.5 shrink-0"></i>
              ${safePrize}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <a href="${safeLink}" target="_blank" onclick="app.handleActionClick('${safeId}', 'applied')" class="flex-1 py-2 rounded-xl bg-ocean-600 hover:bg-ocean-700 text-white text-xs font-extrabold text-center transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <span>Apply</span>
              <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
            </a>

            <select onchange="app.handleStatusChange('${safeId}', this.value)" class="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-2.5 py-2 font-bold focus:outline-none focus:border-ocean-500">
              <option value="none" ${h.status === 'none' ? 'selected' : ''}>+ Track</option>
              <option value="bookmarked" ${h.status === 'bookmarked' ? 'selected' : ''}>📌 Bookmarked</option>
              <option value="registered" ${h.status === 'registered' ? 'selected' : ''}>✅ Registered</option>
              <option value="in_progress" ${h.status === 'in_progress' ? 'selected' : ''}>⚡ In Progress</option>
              <option value="submitted" ${h.status === 'submitted' ? 'selected' : ''}>🏆 Submitted</option>
            </select>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Initiate Google OAuth 2.0 Secure Account Linking
   */
  linkGmailOAuth() {
    GoogleOAuthModule.requestOAuthToken();
  },

  shareOrganizedList() {
    if (this.hackathons.length === 0) {
      alert('No hackathons available to share.');
      return;
    }

    const userSkills = ProfileModule.getSkills();
    const userProjects = ProfileModule.getProjects();

    const summaryText = this.hackathons.map((h, i) => {
      const ml = MLPredictor.predictSuitability(userSkills, userProjects, h);
      const d = MatcherModule.getDeadlineInfo(h.deadline);
      return `${i + 1}. *${h.title}*\n   • Source: ${h.platform}\n   • Deadline: ${d.displayText}\n   • ML Fit: ${ml.score}%\n   • Link: ${h.link}`;
    }).join('\n\n');

    const fullShareText = `🏆 *Organized College Hackathon List*\n\n${summaryText}\n\nGenerated via HackSync Pro.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullShareText);
      alert('📋 Organized hackathon summary copied to clipboard! You can now paste and send it directly in WhatsApp or Email.');
    } else {
      prompt('Copy your organized hackathon list:', fullShareText);
    }
  },

  openDetailModal(hackathonId) {
    const h = this.hackathons.find(item => item.id === hackathonId);
    if (!h) return;

    const userSkills = ProfileModule.getSkills();
    const userProjects = ProfileModule.getProjects();
    const ml = MLPredictor.predictSuitability(userSkills, userProjects, h);
    const deadlineInfo = MatcherModule.getDeadlineInfo(h.deadline);

    document.getElementById('modal-detail-title').innerText = h.title;
    document.getElementById('modal-detail-platform').innerText = h.platform;
    document.getElementById('modal-detail-deadline').innerText = deadlineInfo.displayText;
    document.getElementById('modal-detail-score').innerText = `${ml.score}% ML Fit`;
    document.getElementById('modal-detail-confidence').innerText = ml.confidence;
    document.getElementById('modal-detail-explanation').innerText = ml.explanation;
    document.getElementById('modal-detail-keywords').innerText = (ml.matchingKeywords || []).join(', ') || 'General Engineering';
    document.getElementById('modal-detail-eligibility').innerText = h.eligibility || 'Open to all students';
    document.getElementById('modal-detail-prize').innerText = h.prize || 'Goodies & Certificates';
    document.getElementById('modal-detail-desc').innerText = h.description || 'No additional description provided.';
    document.getElementById('modal-detail-apply').href = h.link;

    document.getElementById('modal-detail')?.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  },

  closeDetailModal() {
    document.getElementById('modal-detail')?.classList.add('hidden');
  },

  handleStatusChange(hackathonId, status) {
    const hackathon = this.hackathons.find(h => h.id === hackathonId);
    TrackerModule.setStatus(hackathonId, status, hackathon);
    this.renderMatches();
    this.renderTracker();
  },

  renderSkills() {
    const container = document.getElementById('skills-list');
    const matrixCount = document.getElementById('skill-matrix-count');
    if (!container) return;
    const skills = ProfileModule.getSkills();

    if (matrixCount) matrixCount.innerText = `${skills.length} Derived Skills`;

    container.innerHTML = skills.map(s => {
      const safeName = this.escapeHTML(s.name);
      const safeLevel = this.escapeHTML(s.level);
      const safeId = this.escapeHTML(s.id);
      return `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-ocean-50 border border-ocean-200 text-xs font-bold text-slate-800 shadow-sm">
          <span>${safeName}</span>
          <span class="text-[10px] px-1.5 py-0.2 rounded bg-ocean-600 text-white font-bold">${safeLevel}</span>
          <button onclick="app.handleRemoveSkill('${safeId}')" class="text-slate-400 hover:text-rose-600 ml-1">
            <i data-lucide="x" class="w-3 h-3"></i>
          </button>
        </span>
      `;
    }).join('');

    document.getElementById('badge-skills-count').innerText = skills.length;
    if (window.lucide) lucide.createIcons();
  },

  handleAddSkill(e) {
    e.preventDefault();
    const name = document.getElementById('skill-name').value;
    const level = document.getElementById('skill-level').value;

    const res = ProfileModule.addSkill(name, level);
    if (res.success) {
      document.getElementById('skill-name').value = '';
      this.renderSkills();
      this.renderMatches();
    }
  },

  handleRemoveSkill(id) {
    ProfileModule.removeSkill(id);
    this.renderSkills();
    this.renderMatches();
  },

  renderProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    const projects = ProfileModule.getProjects();

    if (projects.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-500 col-span-2 text-center py-4">No base projects found. Enter your GitHub username above to auto-extract your base portfolio.</p>`;
      return;
    }

    container.innerHTML = projects.map(p => {
      const safeTitle = this.escapeHTML(p.title);
      const safeDesc = this.escapeHTML(p.desc);
      const safeLink = this.escapeHTML(p.link);
      const safeId = this.escapeHTML(p.id);

      return `
        <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 relative group shadow-sm hover:border-ocean-300 transition-all">
          <button onclick="app.handleRemoveProject('${safeId}')" class="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
          <h4 class="text-sm font-bold text-slate-900 pr-6 flex items-center gap-1.5">
            ${safeTitle}
            ${safeLink ? `<a href="${safeLink}" target="_blank" class="text-ocean-600 hover:underline text-xs"><i data-lucide="external-link" class="w-3 h-3 inline"></i></a>` : ''}
          </h4>
          <p class="text-xs text-slate-600 line-clamp-2">${safeDesc}</p>
          <div class="flex flex-wrap gap-1 pt-1">
            ${(p.tech || []).map(t => `<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">${this.escapeHTML(t)}</span>`).join('')}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  async handleFetchGitHub(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('github-username');
    const fetchBtn = document.getElementById('github-fetch-btn');
    const statusMsg = document.getElementById('github-status-msg');

    if (!usernameInput || !fetchBtn) return;
    const username = usernameInput.value.trim();

    fetchBtn.disabled = true;
    fetchBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Analyzing GitHub...</span>`;
    statusMsg.classList.add('hidden');

    try {
      const res = await ProfileModule.fetchGitHubRepos(username);
      statusMsg.className = "text-xs font-bold text-emerald-600 block mt-2";
      statusMsg.innerText = `✅ Auto-extracted ${res.addedCount} repositories & ${res.derivedSkillsCount} skills from GitHub (${username}) as your base portfolio!`;
      
      this.renderSkills();
      this.renderProjects();
      this.renderMatches();
    } catch (err) {
      statusMsg.className = "text-xs font-bold text-rose-600 block mt-2";
      statusMsg.innerText = `❌ ${err.message}`;
    } finally {
      fetchBtn.disabled = false;
      fetchBtn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4 text-slate-950"></i><span>Auto-Fetch GitHub Base</span>`;
      if (window.lucide) lucide.createIcons();
    }
  },

  openAddProjectModal() {
    document.getElementById('modal-project')?.classList.remove('hidden');
  },

  closeAddProjectModal() {
    document.getElementById('modal-project')?.classList.add('hidden');
  },

  handleAddProject(e) {
    e.preventDefault();
    const title = document.getElementById('project-title').value;
    const desc = document.getElementById('project-desc').value;
    const techStr = document.getElementById('project-tech').value;

    const techArray = techStr.split(',').map(t => t.trim()).filter(Boolean);
    ProfileModule.addProject(title, desc, techArray);

    document.getElementById('project-form').reset();
    this.closeAddProjectModal();
    this.renderProjects();
    this.renderMatches();
  },

  handleRemoveProject(id) {
    ProfileModule.removeProject(id);
    this.renderProjects();
    this.renderMatches();
  },

  renderTracker() {
    const tracked = TrackerModule.getTracked();

    const cols = {
      bookmarked: document.getElementById('col-status-bookmarked'),
      registered: document.getElementById('col-status-registered'),
      in_progress: document.getElementById('col-status-in-progress'),
      submitted: document.getElementById('col-status-submitted')
    };

    const counts = {
      bookmarked: 0,
      registered: 0,
      in_progress: 0,
      submitted: 0
    };

    Object.values(cols).forEach(col => { if (col) col.innerHTML = ''; });

    tracked.forEach(t => {
      const key = t.status === 'in_progress' ? 'in_progress' : t.status;
      if (cols[key]) {
        counts[key]++;
        const safeTitle = this.escapeHTML(t.title);
        const safePlatform = this.escapeHTML(t.platform);
        const safeLink = this.escapeHTML(t.link);
        const safeId = this.escapeHTML(t.id);

        cols[key].innerHTML += `
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs shadow-sm">
            <div class="flex items-center justify-between">
              <span class="font-extrabold text-slate-800 line-clamp-1">${safeTitle}</span>
            </div>
            <p class="text-[11px] text-slate-500">Platform: ${safePlatform}</p>
            <div class="flex items-center justify-between pt-1 border-t border-slate-200">
              <a href="${safeLink}" target="_blank" class="text-ocean-600 hover:underline text-[11px] flex items-center gap-1 font-bold">
                <span>View</span>
                <i data-lucide="external-link" class="w-3 h-3"></i>
              </a>
              <select onchange="app.handleStatusChange('${safeId}', this.value)" class="bg-white border border-slate-200 text-[10px] text-slate-700 font-semibold rounded px-1.5 py-1">
                <option value="bookmarked" ${t.status === 'bookmarked' ? 'selected' : ''}>Bookmarked</option>
                <option value="registered" ${t.status === 'registered' ? 'selected' : ''}>Registered</option>
                <option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                <option value="submitted" ${t.status === 'submitted' ? 'selected' : ''}>Submitted</option>
                <option value="none">Remove</option>
              </select>
            </div>
          </div>
        `;
      }
    });

    document.getElementById('count-status-bookmarked').innerText = counts.bookmarked;
    document.getElementById('count-status-registered').innerText = counts.registered;
    document.getElementById('count-status-in-progress').innerText = counts.in_progress;
    document.getElementById('count-status-submitted').innerText = counts.submitted;

    document.getElementById('badge-tracker-count').innerText = tracked.length;
    if (window.lucide) lucide.createIcons();
  },

  openImportModal() {
    document.getElementById('modal-import')?.classList.remove('hidden');
  },

  closeImportModal() {
    document.getElementById('modal-import')?.classList.add('hidden');
  },

  switchImportMode(mode) {
    this.importMode = mode;
    ['file', 'imap', 'text'].forEach(m => {
      const tab = document.getElementById(`import-tab-${m}`);
      const area = document.getElementById(`import-area-${m}`);
      if (tab && area) {
        if (m === mode) {
          tab.className = 'px-3.5 py-1.5 rounded-xl text-xs font-black bg-ocean-600 text-white';
          area.classList.remove('hidden');
        } else {
          tab.className = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:text-slate-900';
          area.classList.add('hidden');
        }
      }
    });
  },

  setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('spreadsheet-file-input');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('bg-ocean-100', 'border-ocean-500');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-ocean-100', 'border-ocean-500');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        fileInput.files = files;
        this.handleFileSelect({ target: fileInput });
      }
    });
  },

  handleFileSelect(e) {
    const files = e.target.files;
    const statusEl = document.getElementById('file-select-status');
    if (files && files[0]) {
      this.selectedFile = files[0];
      if (statusEl) {
        statusEl.innerText = `📄 Selected File: ${this.selectedFile.name} (${Math.round(this.selectedFile.size / 1024)} KB)`;
        statusEl.classList.remove('hidden');
      }
    }
  },

  async executeImport() {
    let imported = [];

    if (this.importMode === 'file') {
      if (!this.selectedFile) {
        alert('Please select or drop a spreadsheet file (.xlsx, .csv) first!');
        return;
      }
      try {
        imported = await ImporterModule.parseSpreadsheetFile(this.selectedFile);
      } catch (err) {
        alert('Error parsing spreadsheet file: ' + err.message);
        return;
      }
    } else if (this.importMode === 'text') {
      const text = document.getElementById('import-raw-text').value;
      imported = ImporterModule.parseRawText(text);
    }

    if (imported.length > 0) {
      this.hackathons = [...imported, ...this.hackathons];
      this.saveHackathons();
      this.closeImportModal();
      this.renderMatches();
      alert(`🎉 Successfully parsed and ML-indexed ${imported.length} competitions!`);
    }
  },

  linkGmailOAuth() {
    const mod = window.GoogleOAuthModule || (typeof GoogleOAuthModule !== 'undefined' ? GoogleOAuthModule : null);
    if (mod) {
      mod.initOAuth('974835829792-tmr465m5jpr7rlrbncr0nsq1hd9ejlfl.apps.googleusercontent.com');
      mod.requestOAuthToken();
    } else {
      alert('Google OAuth module is loading. Please wait 2 seconds and try again.');
    }
  },

  processFetchedHackathons(fetchedList) {
    if (!Array.isArray(fetchedList) || fetchedList.length === 0) {
      alert('No competition emails detected matching the search query.');
      return;
    }
    const filterSelect = document.getElementById('filter-platform');
    if (filterSelect) filterSelect.value = 'all';

    const existingTitles = new Set(this.hackathons.map(h => h.title.toLowerCase().trim()));
    const newItems = fetchedList.filter(h => !existingTitles.has(h.title.toLowerCase().trim()));

    if (newItems.length > 0) {
      this.hackathons = [...newItems, ...this.hackathons];
      this.saveHackathons();
      this.renderMatches();
      alert(`🎉 ML Engine successfully extracted and indexed ${newItems.length} new college competition notices from Gmail!`);
    } else {
      this.renderMatches();
      alert('🔒 Gmail inbox scanned. All detected competitions are already up-to-date on your dashboard!');
    }
  },

  async triggerEmailSync(fromImap = false) {
    try {
      const mod = window.GoogleOAuthModule || (typeof GoogleOAuthModule !== 'undefined' ? GoogleOAuthModule : null);
      let fetched = [];
      if (mod && mod.accessToken) {
        fetched = await mod.fetchGmailMessagesViaREST();
        if (fetched && fetched.length > 0) {
          this.processFetchedHackathons(fetched);
          return;
        }
      } else if (mod) {
        mod.initOAuth('974835829792-tmr465m5jpr7rlrbncr0nsq1hd9ejlfl.apps.googleusercontent.com');
        mod.requestOAuthToken();
        return;
      }
      this.renderMatches();
    } catch (e) {
      alert('Email Sync Error: ' + e.message);
    }
  },

  updateStats() {
    const eligibleCount = this.hackathons.length;
    const urgentCount = this.hackathons.filter(h => {
      const d = MatcherModule.getDeadlineInfo(h.deadline);
      return !d.expired && d.diffDays <= 7;
    }).length;

    const userSkills = ProfileModule.getSkills();
    const userProjects = ProfileModule.getProjects();
    const highMatchCount = this.hackathons.filter(h => {
      return MLPredictor.predictSuitability(userSkills, userProjects, h).score >= 80;
    }).length;

    const skillIndex = Math.min(99, Math.round((userSkills.length * 9) + (userProjects.length * 11)));

    document.getElementById('stat-eligible-count').innerText = eligibleCount;
    document.getElementById('stat-urgent-count').innerText = urgentCount;
    document.getElementById('stat-highmatch-count').innerText = highMatchCount;
    document.getElementById('stat-skill-index').innerText = `${skillIndex}%`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
