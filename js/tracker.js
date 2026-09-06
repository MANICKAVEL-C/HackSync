/**
 * Tracker Module — Personal Hackathon Participation Board
 */

const TrackerModule = {
  
  getTracked() {
    const data = localStorage.getItem('hacksync_tracker');
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  },

  saveTracked(items) {
    localStorage.setItem('hacksync_tracker', JSON.stringify(items));
  },

  // Update status (Bookmarked, Registered, In Progress, Submitted)
  setStatus(hackathonId, status, hackathonData) {
    let tracked = this.getTracked();
    const existingIndex = tracked.findIndex(t => t.id === hackathonId);

    if (existingIndex >= 0) {
      if (status === 'none') {
        // Remove from tracker
        tracked.splice(existingIndex, 1);
      } else {
        tracked[existingIndex].status = status;
        tracked[existingIndex].updatedAt = new Date().toISOString();
      }
    } else if (status !== 'none' && hackathonData) {
      tracked.push({
        id: hackathonId,
        title: hackathonData.title,
        platform: hackathonData.platform,
        deadline: hackathonData.deadline,
        link: hackathonData.link,
        prize: hackathonData.prize,
        status: status,
        addedAt: new Date().toISOString()
      });
    }

    this.saveTracked(tracked);
    return tracked;
  },

  getStatus(hackathonId) {
    const item = this.getTracked().find(t => t.id === hackathonId);
    return item ? item.status : 'none';
  }
};
