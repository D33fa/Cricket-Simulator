document.addEventListener("DOMContentLoaded", () => {

  const totalInnings = 4;
  const maxDays = 5;

  // Match state
  let currentInnings = 0;
  let balls = 0;
  let wickets = 0;
  let runs = 0;
  let inningsTotals = [0,0,0,0];
  let followOnEnforced = false;
  let matchEnded = false;

  // Simulated time
  let currentDay = 1;
  let simulatedTime = 0; // minutes since 10:30
  const sessionTimes = [
    {name:"Morning", start:0, end:120},       // 10:30 - 12:30
    {name:"Afternoon", start:160, end:280},   // 1:10 - 3:10
    {name:"Final", start:300, end:420}        // 3:30 - 5:30
  ];
  const breakTimes = [
    {name:"Lunch", start:120, end:160},
    {name:"Tea", start:280, end:300}
  ];
  let currentSessionIndex = 0;

  // Player tracking
  let strikerIndex = 0;
  let nonStrikerIndex = 1;
  let currentBowlerIndex = 0;

  // HTML elements
  const scoreEl = document.getElementById("score");
  const completedScoresEl = document.getElementById("completed-scores");
  const scorecardEls = [
    document.querySelector("#scorecard1 tbody"),
    document.querySelector("#scorecard2 tbody"),
    document.querySelector("#scorecard3 tbody"),
    document.querySelector("#scorecard4 tbody")
  ];
  const clockEl = document.getElementById("clock");
  const dayEl = document.getElementById("day");
  const logEl = document.getElementById("log-messages");

  // Dynamic batting teams
  let battingTeams = ["Team A","Team B","Team A","Team B"];

  // Batsmen
  let teamBatsmen = Array.from({length:4},(_,i)=>Array.from({length:11},(__,j)=>({
    name:`${battingTeams[i]}_Player${j+1}`, 
     runs:0, 
     balls:0,
     out: false,
     dismissal: null
  })));

  // Bowlers
  let inningsBowlers = Array.from({length:4},(_,i)=>Array.from({length:4},(__,j)=>({
    name:`${i%2===0?"B":"A"}_Bowler${j+1}`, ballsBowled:0, runsConceded:0, wicketsTaken:0
  })));

  const dismissalTypes = [
  { type: "Bowled", bowlerCredit: true },
  { type: "Caught", bowlerCredit: true },
  { type: "LBW", bowlerCredit: true },
  { type: "Run Out", bowlerCredit: false },
  { type: "Stumped", bowlerCredit: true },
  { type: "Hit Wicket", bowlerCredit: true },
  { type: "Handled Ball", bowlerCredit: false },
  { type: "Obstructing the Field", bowlerCredit: false }
  ];

  dismissal = {
  type: "Caught",
  bowler: "Player 5",
  fielder: "Player 3" // only where applicable
  };

  // Helpers
  const pad = n=>n<10?"0"+n:n;
  const formatOvers = balls=>`${Math.floor(balls/6)}.${balls%6}`;

  function getRandomDismissal() {
    const d = dismissalTypes[Math.floor(Math.random() * dismissalTypes.length)];
    return {
      type: d.type,
      bowlerCredit: d.bowlerCredit
    };
  }

  function getRandomFielder() {
    return inningsBowlers[currentInnings][
      Math.floor(Math.random() * inningsBowlers[currentInnings].length)
    ];
  }

  function checkBreaks() {
    for (let b of breakTimes) {
      if (simulatedTime >= b.start && simulatedTime < b.end) {
        simulatedTime = b.end; // skip the break
        updateClock();
        alert(b.name); // "Lunch" / "Tea"
        return true;   // <-- SIGNAL STOP
      }
    }
    return false;
  }

  function updateClock() {
    const baseHour = 10;        // 10 AM
    const baseMinute = 30;      // 30 minutes past 10
    const roundedMinutes = Math.round(simulatedTime);
    const totalMinutes = roundedMinutes + baseMinute;

    const hours = baseHour + Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    clockEl.innerText = `${pad(hours)}:${pad(minutes)}`;
    dayEl.innerText = `Day ${currentDay}`;
  }

  function bowlBall() {
    const r=Math.random();
    if(r<0.05) { 
      const dismissal = getRandomDismissal();
      return {
          type:"wicket",
          dismissal
        };
      }
      if(r<0.30) return {type:"runs", value:0};
      if(r<0.55) return {type:"runs", value:1};
      if(r<0.75) return {type:"runs", value:2};
      if(r<0.90) return {type:"runs", value:4};
      return {type:"runs", value:6
    };
  }

  function rotateStrike(runs){ if(runs%2===1)[strikerIndex,nonStrikerIndex]=[nonStrikerIndex,strikerIndex]; }
  function endOfOver(){ [strikerIndex,nonStrikerIndex]=[nonStrikerIndex,strikerIndex]; }

  function dismissalText(b) {
    if (!b.out) return "not out";

    const d = b.dismissal;

    switch (d.type) {
      case "Bowled":
        return `b ${d.bowler}`;
      case "Caught":
        return `c ${d.fielder} b ${d.bowler}`;
      case "LBW":
        return `lbw b ${d.bowler}`;
      case "Run Out":
        return `run out (${d.fielder})`;
      case "Stumped":
        return `st ${d.fielder} b ${d.bowler}`;
      default:
        return d.type;
    }
  }

  function updateScorecard(){
    const batsmen = teamBatsmen[currentInnings];
    scorecardEls[currentInnings].innerHTML = "";

    batsmen.forEach((b, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${b.name}</td>
        <td>${dismissalText(b)}</td>
        <td>${b.runs}</td>
        <td>${b.balls}</td>
        <td>${i === strikerIndex && !b.out ? "*" : ""}</td>
      `;
      scorecardEls[currentInnings].appendChild(tr);
    });
  }

  function updateBowlersTable(){
    const bowlersEl=document.querySelector(`#bowlers${currentInnings+1} tbody`);
    const bowlers = inningsBowlers[currentInnings];
    bowlersEl.innerHTML="";
    bowlers.forEach(b=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td>${b.name}</td><td>${formatOvers(b.ballsBowled)}</td><td>${b.runsConceded}</td><td>${b.wicketsTaken}</td>`;
      bowlersEl.appendChild(tr);
    });
  }

  function updateLiveScore(){
    let leadText = "";
    const battingTeam = battingTeams[currentInnings];
    if (currentInnings === 1) {
      // 2nd innings
      const diff = runs - inningsTotals[0];
      leadText = ` – ${battingTeam} ${diff>=0?"ahead":"behind"} by ${Math.abs(diff)} runs`;
    } else if (currentInnings === 2) {
      // 3rd innings
      const combined = inningsTotals[0] + runs;
      const diff = combined - inningsTotals[1];
      leadText = ` – ${battingTeam} ${diff>=0?"ahead":"behind"} by ${Math.abs(diff)} runs`;
    } else if (currentInnings === 3) {
      // 4th innings (optional: target logic later)
      const target = inningsTotals[0] + inningsTotals[2] + 1;
      const remaining = target - (inningsTotals[1] + runs);
      if (remaining > 0) {
        leadText = ` – ${battingTeam} needs ${remaining} runs`;
        } else {
        leadText = ` – ${battingTeam} has won`;
      }
    }
    scoreEl.innerText = `Innings ${currentInnings+1}: ${wickets}/${runs} (${formatOvers(balls)} overs)` + leadText;
  }

  function logBall(striker,bowler,result){
    let text = `${striker} vs ${bowler} – `;
    if(result.type==="wicket") text+="WICKET!";
    else text+=`${result.value} run${result.value!==1?"s":""}`;
    const li=document.createElement("div");
    li.innerText = `[${pad(10+Math.floor(simulatedTime/60))}:${pad(Math.floor(simulatedTime%60))}] ${text}`;
    logEl.appendChild(li);
    logEl.scrollTop=logEl.scrollHeight;
  }

  function endInnings(){
    inningsTotals[currentInnings] = runs;
    const li = document.createElement("li");
    const diff = currentInnings===1?runs-inningsTotals[0] : currentInnings===3?runs+inningsTotals[1]-inningsTotals[0]-inningsTotals[2]:0;
    li.innerText=`Innings ${currentInnings+1}: ${wickets}/${runs} (${formatOvers(balls)} overs)`+ (diff!==0?` – ${battingTeams[currentInnings]} ${diff>=0?"ahead":"behind"} by ${Math.abs(diff)} runs`:"");
    completedScoresEl.appendChild(li);

    // Follow-on logic
    if(currentInnings===1 && inningsTotals[0]-inningsTotals[1]>=200 && !followOnEnforced){
      const enforce = confirm(`${inningsTotals[0]-inningsTotals[1]} runs behind. Enforce follow-on?`);
      if(enforce){
        followOnEnforced=true;
        [teamBatsmen[2],teamBatsmen[3]]=[teamBatsmen[3],teamBatsmen[2]];
        [inningsBowlers[2],inningsBowlers[3]]=[inningsBowlers[3],inningsBowlers[2]];
        [battingTeams[2], battingTeams[3]]=[battingTeams[3], battingTeams[2]];
        alert("Follow-on enforced: batting order adjusted.");
      }
    }

    currentInnings++;
    balls=0; wickets=0; runs=0; strikerIndex=0; nonStrikerIndex=1; currentBowlerIndex=0;
  }

  function playSession(){

    if(matchEnded || currentDay>maxDays || currentInnings>=totalInnings){
      alert("Match finished or drawn.");
      return;
    }

    const session=sessionTimes[currentSessionIndex];
    const sessionEnd = session.end;

    function playBall(){
      if(matchEnded) return;

      // Skip breaks if needed
      if (checkBreaks()) {
       return; // prevents setTimeout(playBall, 200)
      }

      // Check session end or innings end
      if(simulatedTime>=sessionEnd || wickets>=10 || currentInnings>=totalInnings){
        if(wickets>=10) endInnings();
        currentSessionIndex++;
        if(currentSessionIndex>=sessionTimes.length){
          currentSessionIndex=0;
          simulatedTime=0;
          currentDay++;
          alert(`End of Day ${currentDay-1}`);
        }
        return;
      }

      const batsmen = teamBatsmen[currentInnings];
      const bowler = inningsBowlers[currentInnings][currentBowlerIndex];
      const striker = batsmen[strikerIndex];

      balls++;
      const result=bowlBall();

      if(result.type==="wicket"){
        wickets++;

        const dismissal = result.dismissal;
        striker.out = true;

        striker.dismissal = {
          type: dismissal.type,
          bowler: dismissal.bowlerCredit ? bowler.name : null,
          fielder: dismissal.type === "Caught" || dismissal.type === "Run Out"
          ? getRandomFielder().name
          : null
        };

        bowler.wicketsTaken++;
        const nextBatsman = batsmen.findIndex((b,i)=>b.balls===0 && !b.out && i!==strikerIndex && i!==nonStrikerIndex);
        if(nextBatsman!==-1) strikerIndex=nextBatsman;
      } else {
        striker.runs += result.value;
        striker.balls++;
        runs += result.value;
        bowler.runsConceded += result.value;
        rotateStrike(result.value);
      }

      bowler.ballsBowled++;
      if(balls%6===0){
        endOfOver();
        currentBowlerIndex=(currentBowlerIndex+1)%inningsBowlers[currentInnings].length;
      }

      simulatedTime += 2/3; // 40 seconds per ball 
      updateClock();
      updateScorecard();
      updateBowlersTable();
      updateLiveScore();
      logBall(striker.name, bowler.name, result);

      // Check 3rd innings loss
      if(currentInnings===2 && !followOnEnforced && wickets>=10){
        if(inningsTotals[0]+runs<inningsTotals[1]){
          alert("Team A loses the match!");
          matchEnded=true;
          return;
        }
      }

      // 4th innings win
      if(currentInnings===3 && runs+inningsTotals[1]>=inningsTotals[0]+inningsTotals[2]){
        alert(`Team B wins by ${runs+inningsTotals[1]-inningsTotals[0]-inningsTotals[2]} runs!`);
        matchEnded=true;
        return;
      }

      if(!matchEnded) setTimeout(playBall, 200); // 0.2s per ball for real-time simulation
    }

    playBall();
  }

  document.getElementById("nextSession").addEventListener("click", playSession);
  updateScorecard();
  updateBowlersTable();
  updateClock();

});
