/*global Handlebars, Router */
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
    this.todoTemplate=Handlebars.compile(document.getElementById('todo-template').innerHTML);  
    this.footerTemplate=Handlebars.compile(document.getElementById('footer-template').innerHTML);  
    this.bindEvents();  

    new Router({  
      '/:filter': function (filter) {  
        this.filter=filter;  
        this.render();  
      }.bind(this)  
    }).init('/all');  
  },
  bindEvents: function () {  
    document.getElementById('new-todo').addEventListener('keyup', App.create.bind(this));
    document.getElementById('toggle-all').addEventListener('change', this.toggleAll.bind(this));

    // using ES6 Arrow function, you don't need to bind this
    document.getElementById('footer').addEventListener('click', (event) => {
      if (event.target.id==='clear-completed') {
        this.destroyCompleted();
      }
    });

    document.getElementById('todo-list').addEventListener('change', function (event) {
      if (event.target.className==='toggle') {
        this.toggle(event);
      }
    }.bind(this));
    
    document.getElementById('todo-list').addEventListener('dblclick', function (event) {
      if (event.target.localName==='label') {
        this.edit(event);
      }
    }.bind(this));
    document.getElementById('todo-list').addEventListener('keyup', function (event) {
      if (event.target.className==='edit') {
        this.editKeyup(event);
      }
    }.bind(this));
    document.getElementById('todo-list').addEventListener('focusout', function (event) {
      if (event.target.className==='edit') {
        this.update(event);
      }
    }.bind(this));
    document.getElementById('todo-list').addEventListener('click', function (event) {
      if (event.target.className==='destroy') {
        this.destroy(event);
      }
    }.bind(this));
  },
  render: function () {  
    var todos=this.getFilteredTodos();  
    document.getElementById('todo-list').innerHTML=this.todoTemplate(todos);

    if (todos.length>0) {
      document.getElementById('main').style.display='block';
    } else {
      document.getElementById('main').style.display='none';
    }

    document.getElementById('toggle-all').checked=this.getActiveTodos().length===0;
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

    if (todoCount>0) {
      document.getElementById('footer').innerHTML=template;
      document.getElementById('footer').style.display='block';
    } else {
      document.getElementById('footer').style.display='none';
    };
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
    var id=el.closest('li').dataset.id;
    var todos=this.todos;  
    var i=todos.length;  

    while (i--) {  
      if (todos[i].id===id) {  
        return i;
      }
    }
  },
  create: function (e) {  
    var input=e.target;  
    var val=input.value.trim();  

    if (e.which!==ENTER_KEY||!val) {  
      return;
    }

    this.todos.push({  
      id: util.uuid(),  
      title: val,  
      completed: false  
    });

    input.value='';  
    this.render();  
  },
  toggle: function (e) {  
    var i=this.indexFromEl(e.target);  
    this.todos[i].completed=!this.todos[i].completed;  
    this.render();  
  },
  edit: function (e) {  
    var todoLi=e.target.closest('li');
    todoLi.classList.add('editing');

    var input=todoLi.querySelector('.edit');
    input.focus();
  },
  editKeyup: function (e) {  
    var todo=e.target;

    if (e.which===ENTER_KEY) {  
      todo.blur();
    }

    if (e.which===ESCAPE_KEY) {  
      todo.dataset.abort=true;
      todo.blur();
    }
  },
  update: function (e) {  
    var todo=e.target;
    var val=todo.value.trim();

    if (!val) {  
      this.destroy(e);
      return;
    }

    if (todo.dataset.abort) {
      todo.dataset.abort=false;
    } else {
      this.todos[this.indexFromEl(todo)].title=val;
    }

    this.render();  
  },
  destroy: function (e) {  
    this.todos.splice(this.indexFromEl(e.target), 1);
    this.render(); 
  }
};

App.init();