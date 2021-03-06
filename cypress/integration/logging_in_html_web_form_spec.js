// This recipe is very similar to the 'Logging In - HTML web form'
// except that is uses regular HTML form submission
// instead of using XHR's.

// We are going to test a few things:
// 1. test unauthorized routes using cy.visit + cy.request
// 2. test using a regular form submission (old school POSTs)
// 3. test error states
// 4. test authenticated session states
// 5. use cy.request for much faster performance
// 6. create a custom command

// change the baseUrl since we do lots of separate
// visits and requests in these tests
Cypress.config('baseUrl', 'http://localhost:8082')

describe('Logging In - HTML Web Form', function(){
  before(function(){
    // change the baseUrl since we do lots of separate
    // visits and requests in these tests
    Cypress.config('baseUrl', 'http://localhost:8082')
  })

  beforeEach(function(){
    cy.viewport(500, 380)
  })

  context('Unauthorized', function(){
    it('example: #1 cannot visit /dashboard without a session', function(){
      // we must have a valid session cookie to be logged
      // in else we are redirected to /unauthorized
      cy
        .visit('/dashboard')
        .get('h3').should('contain', 'You are not logged in and cannot access this page')
        .url().should('include', 'unauthorized')
    })

    it('example: #2 can test the redirection behavior with cy.request', function(){
      // instead of visiting the page above we can test more programatically
      // by issuing a cy.request and checking the status code and redirectedToUrl
      // property.
      //
      // the 'redirectedToUrl' property is a special Cypress property under the hood
      // that normalizes the url the browser would normally follow during a redirect
      cy.request({
        url: '/dashboard',
        followRedirect: false // turn off following redirects automatically
      })
      .then((resp) => {
        // should have status code 302
        expect(resp.status).to.eq(302)

        // when we turn off following redirects Cypress will also send us
        // a 'redirectedToUrl' property with the fully qualified URL that we
        // were redirected to.
        expect(resp.redirectedToUrl).to.eq('http://localhost:8082/unauthorized')
      })
    })
  })

  context('HTML form submission', function(){
    beforeEach(function(){
      cy.visit('/login')
    })

    it('displays errors on login', function(){
      cy
        .get('input[name=username]').type('foo')
        .get('input[name=password]').type('bar{enter}')

        // we should have visible errors now
        .get('p.error')
          .should('be.visible')
          .and('contain', 'Username and password incorrect')

        // and still be on the same URL
        .url().should('include', '/login')
    })

    it('redirects to /dashboard on success', function(){
      cy
        .get('input[name=username]').type('cypress')
        .get('input[name=password]').type('password123{enter}')

        // we should be redirected to /dashboard
        .url().should('include', '/dashboard')

        // and our cookie should be set to 'cypress-session-cookie'
        .getCookie('cypress-session-cookie').should('exist')
    })
  })

  context('HTML form submission with cy.request', function(){
    it('can bypass the UI and yet still log in', function(){
      // oftentimes once we have a proper e2e test around logging in
      // there is NO more reason to actually use our UI to log in users
      // doing so wastes a huge amount of time, as our entire page has to load
      // all associated resources have to load, we have to wait to fill the
      // form and for the form submission and redirection process
      //
      // with cy.request we can bypass all of this because it automatically gets
      // and sets cookies under the hood which acts exactly as if these requests
      // came from the browser
      cy
        .request({
          method: 'POST',
          url: '/login', //baseUrl will be prepended to this url
          form: true, //indicates the body should be form urlencoded and sets Content-Type: application/x-www-form-urlencoded headers
          body: {
            username: 'cypress',
            password: 'password123'
          }
        })

        // TODO: add Cypress.Cookies.debug(true) here
        // to show users cy.request sets/gets cookies
        // under the hood

        // just to prove we have a session
        cy.getCookie('cypress-session-cookie').should('exist')
    })
  })

  context('Reusable "login" custom command', function(){
    // typically we'd put this in cypress/support/commands.js
    // but because this custom command is specific to this example
    // we'll keep it here
    Cypress.addParentCommand('loginByForm', (username, password) => {
      // TODO: lets generate our own 'login' Command Log

      // set default args
      username = username || 'cypress'
      password = password || 'password123'

      return cy.request({
        method: 'POST',
        url: '/login',
        form: true,
        body: {
          username: username,
          password: password
        }
      })
    })

    beforeEach(function(){
      // login before each test
      cy.loginByForm()
    })

    it('can visit /dashboard', function(){
      cy
        .visit('/dashboard')
        .get('h2').should('contain', 'dashboard.html')
    })

    it('can visit /users', function(){
      cy
        .visit('/users')
        .get('h2').should('contain', 'users.html')
    })

    it('can simply request other authenticated pages', function(){
      cy
        // instead of visiting each page and waiting for all
        // the associated resources to load, we can instead
        // just issue a simple HTTP request and make an
        // assertion about the response body
        .request('/admin')
        .its('body')
        .should('include', '<h2>admin.html</h2>')
    })
  })
})
