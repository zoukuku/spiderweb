#ifdef 0
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
#endif

/**
 * This singleton provides functionality to update the current grid to a new
 * set of pinned and blocked sites. It adds, moves and removes sites.
 */
let gUpdater = {
  /**
   * Updates the current grid according to its pinned and blocked sites.
   * This removes old, moves existing and creates new sites to fill gaps.
   */
  updateGrid: function Updater_updateGrid() {
    let links = gLinks.getLinks().slice(0, gGrid.cells.length);

    // Find all sites that remain in the grid.
    let sites = this._findRemainingSites(links);

    // Remove sites that are no longer in the grid.
    this._removeLegacySites(sites).then(() => {
      // Freeze all site positions so that we can move their DOM nodes around
      // without any visual impact.
      this._freezeSitePositions(sites);

      // Move the sites' DOM nodes to their new position in the DOM. This will
      // have no visual effect as all the sites have been frozen and will
      // remain in their current position.
      this._moveSiteNodes(sites);

      // Now it's time to animate the sites actually moving to their new
      // positions.
      this._rearrangeSites(sites).then(() => {
        // Try to fill empty cells and finish.
        this._fillEmptyCells(links);

        // Update other pages that might be open to keep them synced.
        gAllPages.update(gPage);
      });
    });
  },

  /**
   * Takes an array of links and tries to correlate them to sites contained in
   * the current grid. If no corresponding site can be found (i.e. the link is
   * new and a site will be created) then just set it to null.
   * @param aLinks The array of links to find sites for.
   * @return Array of sites mapped to the given links (can contain null values).
   */
  _findRemainingSites: function Updater_findRemainingSites(aLinks) {
    let map = {};

    // Create a map to easily retrieve the site for a given URL.
    gGrid.sites.forEach(function (aSite) {
      if (aSite)
        map[aSite.url] = aSite;
    });

    // Map each link to its corresponding site, if any.
    return aLinks.map(function (aLink) {
      return aLink && (aLink.url in map) && map[aLink.url];
    });
  },

  /**
   * Freezes the given sites' positions.
   * @param aSites The array of sites to freeze.
   */
  _freezeSitePositions: function Updater_freezeSitePositions(aSites) {
    aSites.forEach(function (aSite) {
      if (aSite)
        gTransformation.freezeSitePosition(aSite);
    });
  },

  /**
   * Moves the given sites' DOM nodes to their new positions.
   * @param aSites The array of sites to move.
   */
  _moveSiteNodes: function Updater_moveSiteNodes(aSites) {
    let cells = gGrid.cells;

    // Truncate the given array of sites to not have more sites than cells.
    // This can happen when the user drags a bookmark (or any other new kind
    // of link) onto the grid.
    let sites = aSites.slice(0, cells.length);

    sites.forEach(function (aSite, aIndex) {
      let cell = cells[aIndex];
      let cellSite = cell.site;

      // The site's position didn't change.
      if (!aSite || cellSite != aSite) {
        let cellNode = cell.node;

        // Empty the cell if necessary.
        if (cellSite)
          cellNode.removeChild(cellSite.node);

        // Put the new site in place, if any.
        if (aSite)
          cellNode.appendChild(aSite.node);
      }
    }, this);
  },

  /**
   * Rearranges the given sites and slides them to their new positions.
   * @param aSites The array of sites to re-arrange.
   */
  _rearrangeSites: function (aSites) {
    return gTransformation.rearrangeSites(aSites, {unfreeze: true});
  },

  /**
   * Removes all sites from the grid that are not in the given links array or
   * exceed the grid.
   * @param aSites The array of sites remaining in the grid.
   */
  _removeLegacySites: function (aSites) {
    let remainingSites = new Set(aSites);

    function promises() {
      for (let site of gGrid.sites) {
        // The site must be valid and not in the current grid.
        if (site && !remainingSites.has(site)) {
          // Hide the site and remove it from the DOM.
          let remove = site.node.remove.bind(site.node);
          yield gTransformation.hideSite(site).then(remove);
        }
      }
    }

    return Promise.every([p for (p of promises())]);
  },

  /**
   * Tries to fill empty cells with new links if available.
   * @param aLinks The array of links.
   */
  _fillEmptyCells: function (aLinks) {
    let {cells, sites} = gGrid;
    let index = 0;

    // Find empty cells and fill them.
    for (let site of sites) {
      if (!site && aLinks[index]) {
        // Create the new site and fade it in.
        site = gGrid.createSite(aLinks[index], cells[index]);

        // Set the site's initial opacity to zero.
        site.node.style.opacity = 0;

        // Flush all style changes for the dynamically inserted site to make
        // the fade-in transition work.
        window.getComputedStyle(site.node).opacity;
        gTransformation.showSite(site);
      }

      index++;
    }
  }
};
