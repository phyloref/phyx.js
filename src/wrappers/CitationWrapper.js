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

  /** Returns a single string with the entire bibliographic citation. */
  toString() {
    if (!this.citation || isEmpty(this.citation)) return undefined;

    // If we already have a bibliographic citation, we can just return that.
    if (has(this.citation, 'bibliographicCitation')) return this.citation.bibliographicCitation;

    let authors = (this.citation.authors || []).map(author => author.name);
    if (authors.length === 0) authors = ['Anonymous'];
    if (authors.length > 2) authors = [`${authors[0]} et al`];
    let authorsAndTitle = `${authors.join(' and ')} (${this.citation.year || 'n.d.'}) ${this.citation.title || 'Untitled'}`;

    const editorLists = [];
    const editors = (this.citation.editors || []).map(editor => editor.name);
    if (editors.length > 0) editorLists.push(`eds: ${editors.join(' and ')}`);

    const seriesEditors = (this.citation.series_editors || []).map(editor => editor.name);
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
      const pages = (has(this.citation, 'pages')) ? `:${this.citation.pages}` : '';
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