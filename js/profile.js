/**
 * Profile Module — Automated GitHub Base Profile & Skill Extractor
 */

const ProfileModule = {
  // Default Base Projects & Skills
  defaultSkills: [
    { id: 's1', name: 'Python', level: 'Advanced', category: 'AI & Software' },
    { id: 's2', name: 'C / C++', level: 'Advanced', category: 'ECE & Embedded' },
    { id: 's3', name: 'React', level: 'Advanced', category: 'Frontend' },
    { id: 's4', name: 'Node.js', level: 'Intermediate', category: 'Backend' },
    { id: 's5', name: 'Gemini API', level: 'Advanced', category: 'AI & Software' },
    { id: 's6', name: 'Embedded C', level: 'Intermediate', category: 'ECE & Embedded' }
  ],

  defaultProjects: [
    {
      id: 'p1',
      title: 'AI Smart Study & Quiz Generator',
      desc: 'Base Project: Automatically converts PDFs into interactive flashcards and quizzes using Google Gemini API.',
      tech: ['React', 'Python', 'FastAPI', 'Gemini API', 'Tailwind CSS']
    },
    {
      id: 'p2',
      title: 'Smart Environmental IoT Sensor Node',
      desc: 'Base Project: Wireless sensor telemetry node built with ESP32 microcontrollers and Python backend.',
      tech: ['C++', 'Python', 'ESP32', 'MQTT', 'React']
    }
  ],

  getSkills() {
    const data = localStorage.getItem('hacksync_skills');
    if (!data) {
      this.saveSkills(this.defaultSkills);
      return this.defaultSkills;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return this.defaultSkills;
    }
  },

  saveSkills(skills) {
    localStorage.setItem('hacksync_skills', JSON.stringify(skills));
  },

  addSkill(name, level, category) {
    const skills = this.getSkills();
    const existingIndex = skills.findIndex(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (existingIndex >= 0) {
      skills[existingIndex].level = level || skills[existingIndex].level;
      this.saveSkills(skills);
      return { success: true, updated: true };
    }
    const newSkill = {
      id: 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      level: level || 'Intermediate',
      category: category || 'AI & Software'
    };
    skills.push(newSkill);
    this.saveSkills(skills);
    return { success: true, skill: newSkill };
  },

  removeSkill(id) {
    let skills = this.getSkills();
    skills = skills.filter(s => s.id !== id);
    this.saveSkills(skills);
  },

  getProjects() {
    const data = localStorage.getItem('hacksync_projects');
    if (!data) {
      this.saveProjects(this.defaultProjects);
      return this.defaultProjects;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return this.defaultProjects;
    }
  },

  saveProjects(projects) {
    localStorage.setItem('hacksync_projects', JSON.stringify(projects));
  },

  addProject(title, desc, techArray, link = '') {
    const projects = this.getProjects();
    const newProject = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      title: title.trim(),
      desc: desc.trim() || 'GitHub Repository Project',
      tech: techArray.map(t => t.trim()).filter(Boolean),
      link
    };
    projects.push(newProject);
    this.saveProjects(projects);
    return newProject;
  },

  removeProject(id) {
    let projects = this.getProjects();
    projects = projects.filter(p => p.id !== id);
    this.saveProjects(projects);
  },

  /**
   * Automated GitHub Base Extraction Engine
   */
  async fetchGitHubRepos(username) {
    if (!username || !username.trim()) {
      throw new Error('Please enter a valid GitHub username');
    }
    const cleanUser = username.trim().toLowerCase();
    const url = `https://api.github.com/users/${cleanUser}/repos?sort=updated&per_page=15`;

    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) throw new Error(`GitHub user "${cleanUser}" not found.`);
      throw new Error('Failed to fetch repositories from GitHub.');
    }

    const repos = await res.json();
    if (!Array.isArray(repos) || repos.length === 0) {
      throw new Error(`No public repositories found for "${cleanUser}".`);
    }

    const existingProjects = [];
    const languageCounts = {};

    repos.forEach(repo => {
      const techList = [];
      if (repo.language) {
        techList.push(repo.language);
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }

      if (Array.isArray(repo.topics)) {
        repo.topics.forEach(topic => {
          techList.push(topic);
          languageCounts[topic] = (languageCounts[topic] || 0) + 1;
        });
      }

      if (techList.length === 0) techList.push('Code');

      existingProjects.push({
        id: 'gh_' + repo.id,
        title: repo.name,
        desc: repo.description || `GitHub repository by ${cleanUser} (${repo.stargazers_count} ⭐)`,
        tech: Array.from(new Set(techList)),
        link: repo.html_url
      });
    });

    // Save as current base projects dataset
    this.saveProjects(existingProjects);

    // Auto derive skills matrix from language frequencies
    const derivedSkills = [];
    Object.entries(languageCounts).forEach(([lang, count]) => {
      const level = count >= 3 ? 'Advanced' : (count >= 2 ? 'Intermediate' : 'Beginner');
      derivedSkills.push({
        id: 'gh_s_' + lang.toLowerCase(),
        name: lang,
        level: `${level} (${count} repos)`,
        category: 'Extracted from GitHub'
      });
    });

    if (derivedSkills.length > 0) {
      this.saveSkills(derivedSkills);
    }

    localStorage.setItem('hacksync_github_username', cleanUser);
    return { addedCount: repos.length, derivedSkillsCount: derivedSkills.length };
  }
};
