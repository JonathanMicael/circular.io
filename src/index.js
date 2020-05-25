(function(window, document) {
  
const State = {
  New: 0,
  Finish: 1,
  Waiting: 2,
  Running: 3,
  Closed: 4
}

const Simulator = {

  quantityProcesses: 0,

  table: document.querySelector('#table-process'),

  debug: false,

  init: function () {
    const quantum = document.querySelector('#quantum').value.trim();
    const quantityPerMinute = document.querySelector('#quantityPerMinute').value.trim();
    const lifeTime = document.querySelector('#lifeTime').value.trim();
    const chanceDeAwaiting = document.querySelector('#chanceDeAwaiting').value.trim();
    const waitingCycles = document.querySelector('#waitingCycles').value.trim();
    const showClosing = document.querySelector('#showClosing').checked;
    const valid = true;

    const verify = this.verifyInput(1, quantum, quantityPerMinute, lifeTime, waitingCycles) && this.verifyInput(0, chanceDeAwaiting);

    if(verify) {
      this.table.innerHTML = "";

      Scheduler.init({
        quantum,
        quantityPerMinute,
        chanceDeAwaiting,
        waitingCycles,
        lifeTime,
        showClosing
      })
    }
    return valid
  },

  verifyInput: function(arguments){
    let valueMin = arguments[0];

      //Validando somente números
      const regex = /[0-9]*/g;

      for(let i = 1, l = arguments.length; i < l; i++) {
        if(arguments[i] === "" || arguments[i].match(regex)[0] !== arguments[i]) {
          if(valueMin && window.parseInt(arguments[i], 10) >= valueMin) {
            window.alert("Valor não pode ser zero");
            return false;
          }
          window.alert("Valor dos parâmetros deve ser preenchido e deve ser numérico");
          return false;
        }
      }
      return true;
  },
  rateCreation: function(tx) {
    let label = document.querySelector("#rate-creation");
    label.innerHTML = tx;
  },

  throughput: function(tx) {
    let label = document.querySelector("#throughput");
    label.innerHTML = tx;
  },

  process: function(processes, closed) {
    let actived = processes - closed;
    let processCreated = document.querySelector("#process-created");
    let processClosed = document.querySelector("#process-closed");
    let processAtived = document.querySelector("#process-actived");

    processCreated.innerHTML = processes;
    processClosed.innerHTML = closed;
    processAtived.innerHTML = actived;
  },
  addProcess: function(pid, codState) {
    let line, state;

    if(this.quantityProcesses <= 1) {
      line = "<tr><td>PID</td><td class='turnaround'>Turnaround</td><td>Estado</td></tr>";
      this.table.innerHTML = line;
    }

    state = this.getObjState(codState);

    line = "<tr id='p"+ pid +"'>";
    line += "<td>" + pid + "</td>";
    line += "<td class='turnaround'>0ms</td>";
    line += "<td class='"+ state.color +"'>";
    line += state.name +"</td>";
    line += "</tr>";
    this.table.innerHTML += line;
    
    this.quantityProcesses++;

  },
  changeProcess: function(pid, codState, turnaround) {
    try {
      let process = document.querySelector("#p" + pid);
      let state = this.getObjState(codState);
      let turnaroundText = process.querySelector(".turnaround");
      let elementText = process.querySelector("td:last-child");
      turnaroundText.innerHTML = turnaround + "ms";
      elementText.className = state.color;
      elementText.innerHTML = state.name;
    }
    catch(e) {
      if(this.debug)
        window.console.error("Processo já removido: " + e.message);
    }
  },
  removeProcess: function(pid) {
    try {
      let process = document.querySelector("#p" + pid);
      process.parentNode.removeChild(process);
      this.quantityProcesses--;
    }
    catch(e) {
      this.quantityProcesses--;
      if(this.debug)
        window.console.error("Processo já removido: " + e.message);
    }
    finally {
      let line;
      if(this.quantityProcesses <= 0) {
        this.quantityProcesses = 0;
        line = "<tr><td>Nenhum processo</td></tr>";
        this.table.innerHTML = line;
      }
    }
  },

  getObjState: function(state) {
    switch(state) {
      case State.New:
        return {
          name: "Novo",
          color: "preto"
        };
      case State.Finish:
        return {
          name: "Pronto",
          color: "azul"
        };
      case State.Running:
        return {
          name: "Executando",
          color: "verde"
        };
      case State.Waiting:
        return {
          name: "Esperando",
          color: "amarelo"
        };
      case State.Closed:
        return {
          name: "Encerrado",
          color: "vermelho"
        };
    }
  },
  iobound: function(n) {
    let iobound = document.querySelector("#io-bound");
    iobound.innerHTML = n;
  },

  inWaiting: function(n) {
    let inWaiting = document.querySelector("#process-waiting");
    inWaiting.innerHTML = n;
  },
  closeStatistics: function() {
    let data = document.querySelectorAll(".statistics");
    for(let i = 0, l = data.length; i < l; i++) {
      data[i].innerHTML = "0";
    }
  }
}

let Process = (function() {
  Process.prototype.pid = null;
  Process.prototype.state = null;
  Process.prototype.lifeTime = null;
  Process.prototype.chanceDeAwaiting = null;
  Process.prototype.waitingCycles = null;
  Process.prototype.accountant = null;
  Process.prototype.IOBound = false;
  Process.prototype.created = null;

  function Process(options) {
    this.new();
    this.pid = options.pid;
    this.state = this.getState();
    this.created = Date.now();
    this.lifeTime = options.lifeTime;
    this.chanceDeAwaiting = options.chanceDeAwaiting;
    this.waitingCycles = this.accountant = options.waitingCycles;
    this.showClosing = options.showClosing;

    Simulator.addProcess(this.pid, this.state);

    //Processo pronto
    this.finish();
    //Determina se o processo será I/O Bound
    this.IOBound = this.inWaiting();
  }
  Process.prototype.getState = function() {
    return this.state;
  };

  Process.prototype.updateTurnaround = function () {
    return Date.now() - this.created;
  };

  Process.prototype.new = function() {
    if(this.state === null)
      this.state = State.New;
  };

  Process.prototype.finish = function() {
    if(this.state !== State.Closed) {
      this.state = State.Finish;
      Simulator.changeProcess(this.pid, this.state, this.updateTurnaround());
    }
  };

  Process.prototype.inWaiting = function() {
    const PercentageChance = this.chanceDeAwaiting;
    const random = ((Math.random()*100)+1);
    if(random <= PercentageChance) {
      Scheduler.accountantIOBound++;
      Simulator.iobound(Scheduler.accountantIOBound);
      return true;
    }
    Scheduler.accountantNormal++;
    return false;
  };

  Process.prototype.wait = function() {
    if(this.state === State.Running) {
      this.state = this.state.Waiting;
      Scheduler.qtyWaiting++;
      Simulator.inWaiting(Scheduler.qtyWaiting);
      Simulator.changeProcess(this.pid, this.state, this.updateTurnaround());
    }
  };

  Process.prototype.execute = function() {
    this.lifeTime--;
    if(this.lifeTime <= 0) {
      this.close(this.showClosing);
      return;
    }
    if(this.state === State.Finish) {
      this.state = State.Running;
      Simulator.changeProcess(this.pid, this.state, this.updateTurnaround());
      if(this.IOBound)
        this.wait();
    }
    if(this.state === State.Waiting) {
      this.accountant--;
      if(this.accountant <= 0) {
        this.accountant = this.waitingCycles;
        this.IOBound = false;
        Scheduler.qtyWaiting--;
        Simulator.inWaiting(Scheduler.qtyWaiting);
        this.finish();
      }
    }
  };

  Process.prototype.close = function(showClosing) {
    if(this.state !== State.Closed) {
      this.state = State.Closed;
      Simulator.changeProcess(this.pid, this.state, this.updateTurnaround());
      if(!showClosing)
        window.setTimeout(this.destroy.bind(this), 3000);
      Scheduler.finishProcess(this.pid);
    }
  };

  Process.prototype.destroy = function() {
    Simulator.removeProcess(this.pid);
  };

  return Process;
})();

const Scheduler = { // Parâmetros do Scheduler.
    quantum: null,  // Quantidade de tempo que o escalonador leva para trocar o processo
    throughput: 0,   // Quantidade processos encerrados no minuto
    qtyTotalProcesses: 0, // Quantidade de processos já criados
    qtyProcessesClosed: 0,  // Quantidade de processos já encerrados
    lifetime: 30000,  // Tempo de vida default do processo: 30 segundos
    quantityPerMinute: null,   // Quantidade máxima de processos que são instanciados no minuto
    chanceDeAwaiting: null,  // Chance do processo entrar em espera
    showClosing: false, // Flag que determina se processos encerrados saem da visualização
    timerMinute: null, // Clock do minuto do escalonador
    timerSecond: null,  // Clock do segundo do escalonador
    timerExecution: null, // Timer do quantum, troca de processos
    nextPid: null, // Proximo Pid
    processInFocus: null, // Processo Atual
    processesInMinute: 0, // Processos por minuto
    process: {}, // Todos Processos
    lastIndex: 0, // Ultimo Indice
    accountantIOBound: 0, // Total de IO Bound
    qtyWaiting: 0, // Total de processos em espera
    accountantNormal: 0, // contador
    debug: false, // modo de debug

  init: function (options) {
    this.quantum = options.quantum;
    this.quantityPerMinute = options.quantityPerMinute;
    this.lifeTime = options.lifeTime;
    this.chanceDeAwaiting = options.chanceDeAwaiting;
    this.waitingCycles = options.waitingCycles;
    this.showClosing = options.showClosing;

    // Zerando Scheduler
    this.process = {};
    this.nextPid = null;
    this.processInFocus = null;
    this.throughput = 0;
    this.accountantNormal = 0;
    this.accountantIOBound = 0;
    this.qtyWaiting = 0;
    this.qtyTotalProcesses = 0;
    this.qtyProcessesClosed = 0;

    if(this.timerMinute)
      window.clearInterval(this.timerMinute);

    if(this.timerSecond)
      window.clearTimeout(this.timerSecond);

    if(this.timerExecution)
      window.clearInterval(this.timerExecution);

    this.processesInMinute = 0;
    this.generLotofProcesses();

    // Loop contínuo a cada 60 segundos + 1 que move o Scheduler
    this.timerMinute = window.setInterval(function(){
      this.processesInMinute = 0;
      this.generLotofProcesses();
    }.bind(this), 61000);

    this.timerExecution = window.setInterval(this.changeProcess.bind(this), this.quantum);
  },
  generLotofProcesses: function ()  {
    const qty = Math.ceil(this.quantityPerMinute/60);
      //Notifica estatística de taxa de criação ao Simulator
      Simulator.rateCreation(qty);
      if(this.processesInMinute >= this.quantityPerMinute) {
        Simulator.throughput(this.throughput);
        this.throughput = 0;
        if(this.debug) {
          window.console.log("O lote de processos do minuto foi criado");
          window.console.log("NUMERO DE ESPERA: " + this.accountantIOBound);
          window.console.log("NUMERO EXECUTADO: " + this.accountantNormal);
        }
      }
      else {
        for(let i = 0; i < qty; i++) {
          this.createNewProcess();
          this.processesInMinute++;
        }
        this.timerSecond = window.setTimeout(this.generLotofProcesses.bind(this), 1000);
      }
  },
  changeProcess: function() {
    let pids, process, nextPid;

    pids = Object.keys(this.process);

    if(this.nextPid === null) {
      if(pids[0]) {
        this.nextPid = pids[0];
        this.lastIndex = 0;
      }
      else {
        return;
      }
    }
    else {
      nextPid = pids[this.lastIndex];
      if(nextPid) {
        this.nextPid = nextPid;
      }
      else {
        if(pids[0]) {
          this.nextPid = pids[0];
          this.lastIndex = 0;
        }
        else {
          this.nextPid  = null;
        }
      }
    }

    //Parando execução do processo atual se existente e fora da espera
    if(this.processInFocus !== null) {
      if(this.processInFocus.getState() !== State.Waiting)
        this.processInFocus.finish();
    }

    process = this.getProcess(this.nextPid);

    //Executa o próximo Processo se ele existir
    if (process) {
      process.execute();
      this.processInFocus = process;
      this.lastIndex++;
    }
    else {
      this.processInFocus = null;
      this.nextPid = null;
    }
  },
  createNewProcess: function() {
    const pid = this.generatePID();

    const newProcess = new Process({
      pid: pid,
      lifeTime: this.lifeTime,
      showClosing: this.showClosing,
      chanceDeAwaiting: this.chanceDeAwaiting,
      waitingCycles: this.waitingCycles
    });

    this.process[pid] = newProcess;

    //Reporta alteração no número de processos ao Simulador
    Simulator.process(this.qtyTotalProcesses, this.qtyProcessesClosed);

    this.qtyTotalProcesses++;

    if(this.debug) {
      window.console.log("Novo processo adicionado");
      window.console.log(this.processesInMinute);
    }

  },
  getProcess: function(pid) {
    if(this.process[pid] !== undefined)
      return this.process[pid];
    else
      return null;
  },
  finishProcess: function(pid) {
    delete this.process[pid];
    this.throughput++;
    this.qtyProcessesClosed++;
    // Reporta alteração no número de processos ao Simulador
    Simulator.process(this.qtyTotalProcesses, this.qtyProcessesClosed);
    if(this.lastIndex > 0) {
      this.lastIndex--;
    }
  },
  generatePID: function() {
    let pid = "" + this.randomHex() + this.randomHex();
    pid += "-";
    pid += this.randomHex() + this.randomHex();
    pid += "-";
    pid += this.randomHex();
    return pid;
  },
  randomHex: function() {
    return ((1 + Math.random()) * 100000 | 0).toString(16).substring(1);
  },
  debugMode: function() {
    this.debug = !this.debug;
    return this.debug;
  },
}

window.Scheduler = Scheduler;
init = document.querySelector("#initButton");
noneSimulation = document.querySelectorAll(".none-simulation");
simulation = document.querySelectorAll(".simulation");

//Inicia tudo quando apertado o Iniciar Simulação
init.addEventListener("click", function(e){
  e.preventDefault();
  Simulator.closeStatistics();
  if(Simulator.init()) {
    for(let i = 0, l = simulation.length; i < l; i++)
      simulation[i].className = "none-simulation";
    for(let i = 0, l = noneSimulation.length; i < l; i++)
      noneSimulation[i].className = "simulation";
  }
  return false;
}.bind(this), false);

//Liga o debug se a caixa estiver marcada
debug = document.querySelector("#debug");
debug.addEventListener("change", function(e){
  e.preventDefault();
  Scheduler.debugMode();
}, false);

})(window, document);