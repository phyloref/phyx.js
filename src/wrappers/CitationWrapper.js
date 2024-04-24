/**
 * The CitationWrapper wraps a single citation in the Phyx document.
 * Based on BibJSON (http://okfnlabs.org/bibjson/).
 */

const { has, isEmpty } = require('lodash');

class CitationWrapper {
  /**
   * Construct a CitationWrapper.
   */
  constructor(citation) {
    this.citation = citation;
  }

  /**
   * Return a normalized form of a citation.
   *
   * I'm not really sure how to normalize a citation, but the main thing we can do is delete any key
   * that is equivalent to ''. We could interconvert between `name` and
   * `firstname/lastname/middlename`, but that's not really equivalent, is it?
   */
  static normalize(citation) {
    const normalizedCitation = {};
    Object.keys(citation).forEach((key) => {
      // As long as citation[key] has a reasonable value, we copy it into the normalized citation.
      if (citation[key]) {
        normalizedCitation[key] = citation[key];
      }
    });
    return normalizedCitation;
  }
  
  /**
   * Helper method to return a single name for a given agent entry.
   * The algorithm we use is:
   *  - `name`, if one is present.
   *  - Some combination of `lastname`, `firstname` and `middlename`, if present.
   */
  static getAgentName(agent) {
    if (has(agent, 'name')) return agent.name;
    if (has(agent, 'lastname')) {
      if (has(agent, 'firstname')) {
        if (has(agent, 'middlename')) {
          return `${agent.firstname} ${agent.middlename} ${agent.lastname}`;
        }

        return `${agent.firstname} ${agent.lastname}`;
      }
      return `${agent.lastname}`;
    }
    return '(Unable to read name)';
  }

  /** Returns a single string with the entire bibliographic citation. */
  toString() {
    if (!this.citation || isEmpty(this.citation)) return undefined;

    // If we already have a bibliographic citation, we can just return that.
    if (has(this.citation, 'bibliographicCitation')) return this.citation.bibliographicCitation;

    let authors = (this.citation.authors || []).map(CitationWrapper.getAgentName);
    if (authors.length === 0) authors = ['Anonymous'];
    if (authors.length > 2) authors = [`${authors[0]} et al`];

    // The title is based on citation.title, but may include citation.section as well.
    let title = this.citation.title || 'Untitled';
    if (has(this.citation, 'booktitle')) title = `${title} in ${this.citation.booktitle || 'Untitled book'}`;
    let authorsAndTitle = `${authors.join(' and ')} (${this.citation.year || 'n.d.'}) ${title}`;

    const editorLists = [];
    const editors = (this.citation.editors || []).map(CitationWrapper.getAgentName);
    if (editors.length > 0) editorLists.push(`eds: ${editors.join(' and ')}`);

    const seriesEditors = (this.citation.series_editors || []).map(CitationWrapper.getAgentName);
    if (seriesEditors.length > 0) editorLists.push(`series eds: ${seriesEditors.join(' and ')}`);

    if (editorLists.length > 0) authorsAndTitle += ` [${editorLists.join(', ')}]`;

    if (has(this.citation, 'section_title')) {
      authorsAndTitle += ` (section: ${this.citation.section_title})`;
    }

    // Additional info stores details that should be at the end of the figure number,
    // DOIs, URLs, ISBNs and so on.
    let additionalInfo = ' ';
    if (has(this.citation, 'figure')) additionalInfo += ` fig ${this.citation.figure}`;

    // Add DOIs and URLs.
    additionalInfo += (this.citation.identifier || [])
      .filter(id => id.type === 'doi')
      .map(doi => ` doi: ${doi.id}`)
      .join('');
    additionalInfo += (this.citation.link || []).map(link => ` URL: ${link.url}`).join('');

    additionalInfo += (this.citation.identifier || [])
      .filter(id => id.type === 'isbn')
      .map(isbn => ` ISBN: ${isbn.id}`)
      .join('');

    // A citation for a journal article should be different from others.
    if (has(this.citation, 'journal') && this.citation.type === 'article') {
      const journal = this.citation.journal;
      const journalIssue = (has(journal, 'number')) ? `(${journal.number})` : '';
      const pages = (has(journal, 'pages')) ? `:${journal.pages}` : '';
      additionalInfo += (journal.identifier || [])
        .filter(id => id.type === 'issn')
        .map(issn => `ISSN: ${issn.id} `)
        .join('');
      return `${authorsAndTitle} ${journal.name || 'Unknown journal'} ${journal.volume || 'Unknown volume'}${journalIssue}${pages}${additionalInfo}`;
    }

    // If we are here, this must be a book or a book_section.
    if (has(this.citation, 'pages')) additionalInfo += ` pages: ${this.citation.pages}`;

    if (has(this.citation, 'publisher') && has(this.citation, 'city')) {
      return `${authorsAndTitle} ${this.citation.publisher}, ${this.citation.city}${additionalInfo}`;
    }

    if (has(this.citation, 'publisher')) {
      return `${authorsAndTitle} ${this.citation.publisher}${additionalInfo}`;
    }

    return `${authorsAndTitle}${additionalInfo}`.trim();
  }
}

module.exports = {
  CitationWrapper,
};
