const fs = require('fs');
const cheerio = require('cheerio') //for html testing
const inlineCss = require('inline-css'); //for css testing

//include custom matchers
const styleMatchers = require('jest-style-matchers');
expect.extend(styleMatchers);

const htmlPath = __dirname + '/index.html';
const cssPath = __dirname + '/css/style.css';
const html = fs.readFileSync(htmlPath, 'utf-8'); //load the HTML file once

//absolute path for relative loading (if needed)
const baseDir = 'file://'+__dirname+'/';

// describe('Used test-driven development', () => {
//   test('Used Jest to pre-test code, saved in `pretest.txt`', () => {
//     const path = __dirname + '/pretest.txt'
//     const pretest = fs.readFileSync(path, 'utf-8');
//     expect(pretest).toMatch(/FAIL +(problem-a)?\/problem\.spec\.js/)
//   })
// })

describe('Source code is valid', () => {
  test('HTML validates without errors', async () => {
    const lintOpts = {
      'attr-bans':['align', 'background', 'bgcolor', 'border', 'frameborder', 'marginwidth', 'marginheight', 'scrolling', 'style', 'width', 'height'], //adding height, allow longdesc
      'doctype-first':true,
      'doctype-html5':true,
      'html-req-lang':true,
      'attr-name-style': false, //for meta tags
      'line-end-style':false, //either way
      'indent-style':false, //can mix/match
      'indent-width':false, //don't need to beautify
      'line-no-trailing-whitespace': false, //don't need to beautify
      'id-class-style':false, //I like dashes in classnames
      'img-req-alt':false, //for this test; captured later!
    }

    await expect(htmlPath).toHaveNoHtmlLintErrorsAsync(lintOpts);
  })  

  test('CSS validates without errors', async () => {
    await expect(cssPath).toHaveNoCssLintErrorsAsync();
  })
});

describe('Has required HTML', () => {
  let $; //cheerio instance

  beforeAll(() => {
    $ = cheerio.load(html);
  })

  test('Specifies charset', () => {
    expect($('head > meta[charset]').length).toBe(1); //has 1 tag
  })
  
  test('Includes page title', () => {
    let title = $('head > title');
    expect(title.length).toEqual(1); //has 1 tag
    expect(title.text().length).toBeGreaterThan(0); //has content
    expect(title.text()).not.toEqual("My Page Title");
  })

  test('Includes author metadata', () => {
    let author = $('head > meta[name="author"]')
    expect(author.length).toEqual(1); //has 1 tag
    expect(author.attr('content').length).toBeGreaterThan(0); //has content
    expect(author.attr('content')).not.toEqual("your name");
  })

  test('Has a top-level heading', () => {
    let h1 = $('h1');
    expect(h1.length).toEqual(1); //has 1 tag
    expect(h1.text()).toBeTruthy(); //contains text
  })

  test('Has an image', () => {
    let img = $('img');
    expect(img.length).toBeGreaterThanOrEqual(1); //has 1+ tags
    expect(img.attr('src')).toMatch(/^img\/.+/); //image in folder, uses relative path
    // expect(img.attr('src')).not.toMatch(new RegExp("^(\/)|(http)|([a-zA-z]:)")); //uses a relative path
  })

  test('Includes a paragraph', () => {
    let p = $('p');
    expect(p.length).toBeGreaterThanOrEqual(1); //has 1+ tags
    expect(p.text()).toBeTruthy(); //contains text
  })

  test('Includes a hyperlink in the paragraph', () => {
    let a = $('p a');
    expect(a.length).toBeGreaterThanOrEqual(1); //has 1+ tags
    expect(a.attr('href')).toMatch(/https?:\/\/*/); //links to external page
  })

  test('Includes a list', () => {
    expect( $('ul, ol').length ).toBeGreaterThanOrEqual(1); //has 1+ tag
  })

  test('List has at least 3 items', () => {
    let li = $('ul, ol').first().children('li');
    expect( li.length ).toBeGreaterThanOrEqual(3); //has 3 tags

    //no empty items!
    let empty = li.filter(function(i,elem) { return $(this).text().length == 0; })
    expect(empty.length).toBe(0); //no empty items
  })
})

describe('Has required CSS', () => {
  let $; //cheerio instance
  beforeAll(async () => {
    //test CSS by inlining properties and then reading them from cheerio
    let inlined = await inlineCss(html, {url:baseDir, removeLinkTags:false});
    //console.log(inlined);
    $ = cheerio.load(inlined);
  })

  test('Links in local stylesheet', () => {
    let link = $('head > link');
    expect( link.length ).toEqual(1);
    expect( link.attr('href')).toMatch('css/style.css');
  })

  test('Body has default font size', () => {
    expect( $('body').css('font-size') ).toEqual('16px');
  })

  test('Body has default font family', () => {
    let fontFamilySingleQuotes = ($('body').css('font-family')).replace(/"/g, '\'');
    expect(fontFamilySingleQuotes).toMatch(/'Helvetica Neue', *'?Helvetica'?, *'?Arial'?, *sans-serif/);
  })

  test('Paragraphs have specified line height', () => {
    let p = $('p')
    expect(p.css('line-height') ).toEqual('1.5');
    expect(p.attr('id')).toBe(undefined); //shouldn't have id
    expect(p.attr('class')).toBe(undefined); //shouldn't have class
  })

  test('Images have constrained height', () => {
    expect($('img').css('max-height')).toEqual('400px');
  })

  test('Important list item is colored', () => {
    let li = $('li[class]')
    expect(li.length).toBe(1); //only one item has class
    expect(li.css('color')).toBeDefined(); //that item has a color
  });
})
