const bodyParser = require('body-parser');
let CoinStack = require('coinstack-sdk-js');

let DEBUG = 1;
let index = 0;
let value = [0]
let cnt;

let privateKey = "L3tvu27nKabnQjwnUDvNVreoTn8dBnnivADXPqmpxxEPV3pZcot4";
let fromAddress = "18qTAEu8HGZkw3rPTNCLYMobH9WMK2GrGX";

let client = new CoinStack('c7dbfacbdf1510889b38c01b8440b1', '10e88e9904f29c98356fd2d12b26de', 'c3sp2.blocko.io', 'https');

let source = `
local system = require("system")

-- 투표 생성
-- 이름, 메뉴, 투표 참여자 
function createVote(name, desp, target) 
    scoreBoard = createScoreBoard(name, target)
    system.setItem("vote" .. name, {desp=desp, candidates=target, score=scoreBoard})
end

-- 점수판 생성
-- 이름, 메뉴
function createScoreBoard(name,target)
    scoreBoard={};

    for i=1,table.getn(target) do
    scoreBoard[target[i]]= 0
    end

    return scoreBoard
end

--투표 조회
--이름
function getVote(name)
    return system.getItem("vote" .. name)
end

--투표
--이름, 메뉴 번호
function doVote(name, pick) 
    vote = getVote(name)
    vote.score[pick] = vote.score[pick] +1
    system.setItem("vote" .. name, vote)
end

function getCandidates(name)
    return system.getItem("vote" .. name).candidates
end

--function getResult(name)
    --return system.getItem("vote" .. name).score
--end

function getResult(name)
    local result = system.getItem("vote" .. name).score
    local resultBoard = {}
    local returnValue = {}
    local length = 0;
    for k, v in pairs(result) do
        returnValue = {menu=k, score=v};
        table.insert(resultBoard, returnValue);
    end
    return resultBoard
end
        `


module.exports = function (app) {
    app.use(bodyParser.json());       // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
        extended: true
    }));

    app.get('/', function (req, res) {
        res.render('index.html')
    });

    app.get('/about', function (req, res) {
        res.render('about.html');
    });

    app.get('/definition', function (req, res) {

        let builder = client.createLuaContractBuilder()
        builder = builder.setInput(fromAddress).setContractID(fromAddress);
        builder.setDefinition(source)
        builder.buildTransaction(function (err, tx) {
            try {
                tx.sign(privateKey);
                let rawTx = tx.serialize();
                client.sendTransaction(rawTx, function (err) {
                    if (!err) {
                        if (DEBUG) console.log("definition: ", tx.getHash());
                    }
                });

            } catch (e) {
                if (DEBUG) console.log(e)
            }
        })

        let response = {
            'result': 'true',
            'message': '정의가 완료되었습니다'
        }
        console.log('response : ', response);
        res.status(200).json(response);

    })

    app.get('/createVote', function (req, res) {
        executeSource('call("createVote","sample","점심메뉴?",{"김치찌개","된장찌개","청국장"})');

        if (DEBUG) {
            console.log('+createVote');
        }

        let response = {
            'result': 'true',
            'message': '생성이 완료되었습니다'
        }
        console.log('response : ', response);
        res.status(200).json(response);

    })

    app.post('/myvote', function (req, res) {
        console.log('myvote : ', req.body);
        let candidate = req.body.candidate;

        executeSource(`call("doVote", "sample", "` + candidate + `")`);
        if (DEBUG) console.log("candidate: ", candidate);
        
        let response = {
            'result': 'true',
            'candidate': candidate,
            'message': '투표 완료되었습니다'
        }
        console.log('response : ', response);
        res.status(200).json(response);
    })

    app.get('/listall', function (req, res) {

        getBalance();

        client.queryContract(fromAddress, "LSC", `res,err = call("getResult","sample") return res`, function (err, res) {
            if (err != undefined) return;

            if (DEBUG) {
                console.log("+@getResult:", res); //.result.score);
                console.log("+@results:", res.result);
                console.log("+@length:", res.result.length);
                console.log("+@length:", Object.keys(res.result).length);

            }
            if (value.length) value.pop();

            value.push(res.result);

        });

        let response = {
            'result': 'true',
            'getLists': value
        }
        console.log('response : ', response);
        res.status(200).json(response);

    }); // end of app.get

    function executeSource(source) {
        let builder = client.createLuaContractBuilder()
        builder = builder.setInput(fromAddress).setContractID(fromAddress);
        builder.setExecution(source)
        builder.buildTransaction(function (err, tx) {
            try {
                tx.sign(privateKey);
                let rawTx = tx.serialize();
                client.sendTransaction(rawTx, function (err) {
                    if (!err) {
                        console.log("executeSource: ", tx.getHash());
                    }
                });
            } catch (e) {
                console.log(e)
            }
        })
    }

    function getBalance() {
        client.getBalance(fromAddress, function (err, balance) {
            if (DEBUG) console.log("fromAddress getBalance: ", CoinStack.Math.toBitcoin(balance) + ' BTC');
        });
    }
}
