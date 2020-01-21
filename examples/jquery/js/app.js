/*global jQuery, Handlebars, Router */

'use strict';

Handlebars.registerHelper('eq', function (a, b, options) {
  return a===b? options.fn(this):options.inverse(this);
});

var ENTER_KEY=13;
var ESCAPE_KEY=27;

var util={
  uuid: function () {
    /*jshint bitwise:false */
    var i, random;
    var uuid='';

    for (i=0; i<32; i++) {
      random=Math.random()*16|0;
      if (i===8||i===12||i===16||i===20) {
        uuid+='-';
      }
      uuid+=(i===12? 4:(i===16? (random&3|8):random)).toString(16);
    }

    return uuid;
  },
  pluralize: function (count, word) {
    return count===1? word:word+'s';
  },
  store: function (namespace, data) {
    if (arguments.length>1) {
      return localStorage.setItem(namespace, JSON.stringify(data));
    } else {
      var store=localStorage.getItem(namespace);
      return (store&&JSON.parse(store))||[];
    }
  }
};

var App={
  init: function () {
    this.todos=util.store('todos-jquery');
    // this.todoTemplate=Handlebars.compile($('#todo-template').html());
    var todoHTML=document.getElementById('todo-template').innerHTML;
    this.todoTemplate=Handlebars.compile(todoHTML);
    // this.footerTemplate=Handlebars.compile($('#footer-template').html());
    var footerHTML=document.getElementById('footer-template').innerHTML;
    this.footerTemplate=Handlebars.compile(footerHTML);
    this.bindEvents();

    new Router({
      '/:filter': function (filter) {
        this.filter=filter;
        this.render();
      }.bind(this)
    }).init('/all');
  },
  bindEvents: function () {
    // create
    var newTodoElem=document.getElementById('new-todo');
    newTodoElem.addEventListener('keyup', this.create.bind(this));

    // toggleAll
    var toggleAllElem=document.getElementById('toggle-all');
    toggleAllElem.addEventListener('change', this.toggleAll.bind(this));
    
    // destroyCompleted
    // - this is implemented with ES6 arrow function syntax
    // - note that there is no need to bind this because of the scoping
    // - of arrow functions :) (unlike the other functions)
    var footerElem=document.getElementById('footer');
    footerElem.addEventListener('change', (event) => {
      this.destroyCompleted(event);
    });

    var footerElem=document.getElementById('footer');
    footerElem.addEventListener('click', function(event) {
      if (event.target.id='clear-completed') {
        this.destroyCompleted();
      }
    }.bind(this));

    var todoListElem=document.getElementById('todo-list');

    // toggle
    todoListElem.addEventListener('change', function(event) {
      if (event.target.className='toggle') {
        this.toggle(event);
      }
    }.bind(this));

    // edit
    todoListElem.addEventListener('dblclick', function(event) {
      if (event.target.tagName='LABEL') {
        this.edit(event);
      }
    }.bind(this));

    // editKeyUp
    todoListElem.addEventListener('keyup', function(event) {
      if (event.target.className='edit') {
        this.editKeyup(event);
      }
    }.bind(this));

    todoListElem.addEventListener('focusout', function(event) {
      if (event.target.className='edit') {
        this.update(event);
      }
    }.bind(this));

    // .on('click', '.destroy', this.destroy.bind(this));
    todoListElem.addEventListener('click', function(event) {
      if (event.target.className='destroy') {
        this.destroy(event);
      }
    }.bind(this));
  },
  render: function () {
    var todos=this.getFilteredTodos();
  
    document.getElementById('todo-list').innerHTML=this.todoTemplate(todos);

    // toggle display of list based on existence of todos
    if (todos.length > 0) {
      document.getElementById('main').style.display='block';
    }  else {
      document.getElementById('main').style.display='';
    }

    // $('#toggle-all').prop('checked', this.getActiveTodos().length===0);
    var isAllCompleted=this.getActiveTodos().length=0;
    document.getElementById('toggle-all').checked=isAllCompleted;
    var isAllCompleted=this.getActiveTodos().length==0;
    document.getElementById('toggle-all').checked=isAllCompleted;
    this.renderFooter();
    document.getElementById('new-todo').focus();
    util.store('todos-jquery', this.todos);
  },
  renderFooter: function () {
    var todoCount=this.todos.length;
    var activeTodoCount=this.getActiveTodos().length;
    var template=this.footerTemplate({
      activeTodoCount: activeTodoCount,
      activeTodoWord: util.pluralize(activeTodoCount, 'item'),
      completedTodos: todoCount-activeTodoCount,
      filter: this.filter
    });

    // $('#footer').toggle(todoCount>0).html(template);
    if (todoCount > 0) {
      document.getElementById('footer').style.display='block';
      document.getElementById('footer').innerHTML=template;
    } else {
      document.getElementById('footer').style.display='';
    }
  },
  toggleAll: function (e) {
    var isChecked=e.target.checked;

    this.todos.forEach(function (todo) {
      todo.completed=isChecked;
    });

    this.render();
  },
  getActiveTodos: function () {
    return this.todos.filter(function (todo) {
      return !todo.completed;
    });
  },
  getCompletedTodos: function () {
    return this.todos.filter(function (todo) {
      return todo.completed;
    });
  },
  getFilteredTodos: function () {
    if (this.filter==='active') {
      return this.getActiveTodos();
    }

    if (this.filter==='completed') {
      return this.getCompletedTodos();
    }

    return this.todos;
  },
  destroyCompleted: function () {
    this.todos=this.getActiveTodos();
    this.filter='all';
    this.render();
  },
  // accepts an element from inside the `.item` div and
  // returns the corresponding index in the `todos` array
  indexFromEl: function (el) {
    // get closest li
    var searchingFor='LI';
    var closestElement=null;

    // per, jQuery closest(), starting looking at current element
    var parent=el;

    while (parent !==null) {
      if (parent.nodeName ==searchingFor) {
        closestElement=parent;
        break;
      }
      parent=parent.parentElement
    }

    // get id of closest Element
    if (closestElement) {
      // get id at that element
      // var dataIdPosition=1;
      // var id=closestElement.attributes[dataIdPosition].value;
      var id=closestElement.getAttribute('data-id');
    
      var todos=this.todos;
      var i=todos.length;

      while (i--) {
        if (todos[i].id===id) {
          var temp=i;
          return i;
        }
      }
    } else {
      // signify that no closest could be found
      return -1;
    }
  },
  create: function (e) {
    var val=e.target.value.trim();
    
    if (e.which !==ENTER_KEY || !val) {
      return;
    }

    this.todos.push({
      id: util.uuid(),
      title: val,
      completed: false
    });

    e.target.value='';

    this.render();
  },
  toggle: function (e) {
    var i=this.indexFromEl(e.target);
    this.todos[i].completed=!this.todos[i].completed;
    this.render();
  },
  edit: function (e) {
    // get closest li
    var searchingFor='LI';
    var closestElement=null;

    // per, jQuery closest(), starting looking at current element
    var parent=e.target;

    while (parent!==null) {
      if (parent.nodeName==searchingFor) {
        closestElement=parent;
        break;
      }
      parent=parent.parentElement
    }

    // add class to closet element
    closestElement.classList.add('editing');
    
    // find child with class of edit
    var inputElement=closestElement.querySelectorAll('.edit');

    // you only care about the first (and only) child
    inputElement[0].focus();
  },
  editKeyup: function (e) {
    if (e.which===ENTER_KEY) {
      e.target.blur();
    }   

    if (e.which===ESCAPE_KEY) {
      // $(e.target).data('abort', true).blur();
      e.target.dataset.abort=true;
      e.target.blur();
    }
  },
  update: function (e) {
    var el=e.target;

    // trim value
    var val=el.value.trim();

    if (!val) {
      this.destroy(e);
      return;
    }

    if (el.dataset.abort) {
      el.dataset.abort=false;
    }

    else {
      this.todos[this.indexFromEl(el)].title=val;
    }

    this.render();
  },
  destroy: function (e) {
    this.todos.splice(this.indexFromEl(e.target), 1);
    this.render();
  }
};

function recursiveFind(childEl) {
  // if childEl is null, return
  // if childEl has class of edit, append to results list
  // call vanillaFind on children
  // call vanillaFind on siblings
}

function closestLi(e) {
  // get closest li
  var searchingFor='LI';
  var closestElement=null;

  // per, jQuery closest(), starting looking at current element
  var parent=e.target;

  while (parent!==null) {
    if (parent.nodeName==searchingFor) {
      closestElement=parent;
      return closestElement;
    }
    parent=parent.parentElement
  }

  return closestElement;
}

App.init();
