const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const sdk = require('./sdk');
const crypto = require('crypto');
app.use(express.json()); // application/json 타입 요청 파싱
app.use(express.urlencoded({ extended: true })); // application/x-www-form-urlencoded 타입 요청 파싱

const PORT = 8001;
const HOST = 'localhost';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 간단한 관리자 인증 (실제 환경에서는 더 강력한 인증 시스템 필요)
const ADMIN_PASSWORD = 'admin123'; // 실제 환경에서는 더 보안적으로 강화된 방법사용

// 관리자 인증 미들웨어
function authenticateAdmin(req, res, next) {
    const adminKey = req.headers['admin-key'] || req.query.adminKey;
    if (adminKey !== ADMIN_PASSWORD) {
        return res.status(401).json({ 
            error: '관리자 권한이 필요합니다.',
            message: 'Admin authentication required' 
        });
    }
    next();
}

// ============ 관리자 전용 API ============

// -------------------- MySQL 설정 --------------------

const voting_app = {
  host: 'localhost',
  user: 'root',
  password: '1111',
  database: 'voting_app',
  charset: 'utf8mb4'
};

// SHA-256 해시 함수 (입력 문자열 → 16진수 해시)
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}


// Initialize the voting system with mandatory time setting (Admin only)
// 관리자가 필수 시간 설정
app.get('/admin/init', authenticateAdmin, function (req, res) {
    let durationMinutes = req.query.durationMinutes;
    
    // 투표 시간 필수 입력 체크
    if (!durationMinutes) {
        return res.status(400).json({ 
            error: '투표 시간(분)은 필수입니다.',
            message: 'durationMinutes 파라미터를 입력해주세요. 예: ?durationMinutes=30'
        });
    }
    
    // 숫자 형식 체크
    const duration = parseInt(durationMinutes);
    if (isNaN(duration)) {
        return res.status(400).json({ 
            error: '투표 시간은 숫자로 입력해야 합니다.',
            example: '예: durationMinutes=30'
        });
    }
    
    // 범위 체크
    if (duration < 1) {
        return res.status(400).json({ 
            error: '투표 시간은 최소 1분 이상이어야 합니다.'
        });
    }
    
    if (duration > 1440) {
        return res.status(400).json({ 
            error: '투표 시간은 최대 1440분(24시간)을 초과할 수 없습니다.'
        });
    }
    
    let args = [duration.toString()];
    sdk.send(false, 'initializeVotingSystem', args, res);
});

// Extend voting time (Admin only)
app.get('/admin/extendVotingTime', authenticateAdmin, function (req, res) {
    let additionalMinutes = req.query.additionalMinutes;
    if (!additionalMinutes || isNaN(parseInt(additionalMinutes))) {
        return res.status(400).json({ error: '연장할 시간(분)을 숫자로 입력해주세요.' });
    }
    let args = [additionalMinutes];
    sdk.send(false, 'extendVotingTime', args, res);
});

// Register a product (Admin only)
app.get('/admin/registerProduct', authenticateAdmin, function (req, res) {
    let productId = req.query.productId;
    let productName = req.query.productName;

    if( !productId || !productName) {
        return res.status(400).json({ error: 'productId와 productName은 필수입니다.' });
    }
    let args = [productId, productName];
    sdk.send(false, 'registerProduct', args, res);
});

// Register a candidate (Admin only)
app.get('/admin/registerCandidate', authenticateAdmin, function (req, res) {
    let candidateId = req.query.candidateId;
    let name = req.query.name;
    let partyName = req.query.partyName;
    
    if (!candidateId || !name || !partyName) {
        return res.status(400).json({ error: 'candidateId, name, partyName는 필수입니다.' });
    }
    
    let args = [candidateId, partyName, name];
    sdk.send(false, 'registerCandidate', args, res);
});

// End the voting process (Admin only)
app.get('/admin/endVoting', authenticateAdmin, function (req, res) {
    let args = [];
    sdk.send(false, 'endVoting', args, res);
});

// Get voting results (Admin only)
app.get('/admin/getVotingResults', authenticateAdmin, function (req, res) {
    let args = [];
    sdk.send(true, 'getVotingResults', args, res);
});

// Get all candidates (Admin only)
app.get('/admin/getAllCandidates', authenticateAdmin, function (req, res) {
    let args = [];
    sdk.send(true, 'getAllCandidates', args, res);
});

// Get candidate information (Admin only)
app.get('/admin/getCandidateInfo', authenticateAdmin, function (req, res) {
    let candidateId = req.query.candidateId;
    if (!candidateId) {
        return res.status(400).json({ error: 'candidateId는 필수입니다.' });
    }
    let args = [candidateId];
    sdk.send(true, 'getCandidateInfo', args, res);
});

// delete a candidate (Admin only)
app.get('/admin/deleteCandidate', authenticateAdmin, function (req, res) {
    let candidateId = req.query.candidateId;
    if (!candidateId) {
        return res.status(400).json({ error: 'candidateId는 필수입니다.' });
    }
    let args = [candidateId];
    sdk.send(false, 'deleteCandidate', args, res);
});

// get all products (관리자가 볼 수 있는 상품 목록)
app.get('/admin/getAllProducts', function (req, res) {
    let args = [];
    sdk.send(true, 'getAllProducts', args, res);
});

// ============ 투표자 전용 API ============

// Register a voter
app.post('/voter/registerVoter', async function(req, res, next) {
  try {
    // JSON 바디에서 값 받기
    const { name, rrnFull, address } = req.body;

    // 입력 검증
    if (!name || !rrnFull || !address) {
      return res.status(400).json({ error: 'name, rrnFull, address는 필수입니다.' });
    }
    if (rrnFull.length !== 13) {
      return res.status(400).json({ error: '주민등록번호는 13자리여야 합니다.' });
    }

    // SHA-256 해시 생성
    const nameHash = sha256(name);
    const ssnHash = sha256(rrnFull);
    const addressHash = sha256(address);

    // MySQL 연결 및 저장
    const connection = await mysql.createConnection(voting_app);
    const insertQuery = `
      INSERT INTO voters (name_hash, ssn_hash, address_hash)
      VALUES (?, ?, ?)
    `;
    await connection.execute(insertQuery, [nameHash, ssnHash, addressHash]);
    await connection.end();

    // Fabric 체인코드 호출
    const args = [name, rrnFull];
    await sdk.send(false, 'registerVoter', args, res);

  } catch (err) {
    console.error('유권자 등록 중 에러:', err);
    return res.status(500).json({
      error: '유권자 등록 중 서버 오류가 발생했습니다.',
      detail: err.message,
    });
  }
});

// Cast a vote
app.post('/voter/vote', function (req, res) {
  const voterName = req.query.voterName;
  const rrnFull = req.query.rrnFull;
  const candidateName = req.query.candidateName;
  
  if (!voterName || !rrnFull || !candidateName) {
    return res.status(400).json({ error: 'voterName, rrnFull, candidateName는 필수입니다.' });
  }
  
  const args = [voterName, rrnFull, candidateName];
  sdk.send(false, 'vote', args, res);
});

// Get voter information
app.get('/voter/getVoterInfo', function (req, res) {
    const voterName = req.query.voterName;
    const rrnSuffix = req.query.rrnSuffix;
    
    if (!voterName || !rrnSuffix) {
        return res.status(400).json({ error: 'voterName과 rrnSuffix는 필수입니다.' });
    }
    
    const args = [voterName, rrnSuffix];
    sdk.send(true, 'getVoterInfo', args, res);
});

// Get available candidates for voting (투표자가 볼 수 있는 후보자 목록)
app.get('/voter/getCandidates', function (req, res) {
    let args = [];
    sdk.send(true, 'getAllCandidates', args, res);
});

// Purchase a product (투표자가 상품을 구매)
app.get('/voter/purchaseProduct', function (req, res) {
    const productName = req.query.productName;
    const voterName = req.query.voterName;
    const rrnSuffix = req.query.rrnSuffix;

    if (!productName || !voterName || !rrnSuffix) {
        return res.status(400).json({ error: '상품명, 투표자이름, 주민번호 뒷자리는 모두 필수입니다.' });
    }

    const args = [productName, voterName, rrnSuffix];
    sdk.send(false, 'purchaseProduct', args, res);
});

// get all products (투표자가 볼 수 있는 상품 목록)
app.get('/voter/getAllProducts', function (req, res) {
    let args = [];
    sdk.send(true, 'getAllProducts', args, res);
});

// ============ 공통 API ============

// Check voting status (공개 정보)
app.get('/public/votingStatus', function (req, res) {
    let args = [];
    // 전체 투표 결과를 가져와서 클라이언트에서 필요한 정보만 사용하도록 함
    sdk.send(true, 'getVotingResults', args, res);
});

// ============ 정적 파일 서빙 ============

// 관리자 페이지
app.get('/admin', function (req, res) {
    res.sendFile(path.join(__dirname, '../client/admin.html'));
});

// 투표자 페이지
app.get('/voter', function (req, res) {
    res.sendFile(path.join(__dirname, '../client/voter.html'));
});

// 기본 페이지 (선택 화면)
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 정적 파일들
app.use(express.static(path.join(__dirname, '../client')));

// ============ 에러 핸들링 ============

// 404 에러 처리
app.use(function(req, res, next) {
    res.status(404).json({ error: 'API 엔드포인트를 찾을 수 없습니다.' });
});

// 일반 에러 처리
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
console.log(`관리자 페이지: http://${HOST}:${PORT}/admin`);
console.log(`투표자 페이지: http://${HOST}:${PORT}/voter`);
console.log(`관리자 비밀번호: ${ADMIN_PASSWORD}`);