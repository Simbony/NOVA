from flask import Flask, send_from_directory, request, jsonify
import sqlite3
from datetime import datetime

app = Flask(__name__, static_folder='static')

def get_db_connection():
    conn = sqlite3.connect('questions.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            password TEXT NOT NULL,
            likes INTEGER DEFAULT 0,
            likers TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# index.html 서빙
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

# 질문 등록 API (비밀번호 포함)
@app.route('/api/questions', methods=['POST'])
def add_question():
    data = request.get_json()
    question = data.get('question')
    password = data.get('password')
    
    if not question or not password or len(password) != 4 or not password.isdigit():
        return jsonify({'error': '올바른 질문과 4자리 숫자 비밀번호를 입력해주세요.'}), 400
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('INSERT INTO questions (question, password) VALUES (?, ?)', (question, password))
    conn.commit()
    conn.close()
    
    return jsonify({'message': '질문이 저장되었습니다'}), 201

# 질문 목록 조회 API (공감 정보 포함)
@app.route('/api/questions', methods=['GET'])
def get_questions():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM questions ORDER BY created_at DESC')
    questions = []
    for row in c.fetchall():
        likers = row['likers']
        likers_list = likers.split(',') if likers else []
        questions.append({
            'id': row['id'],
            'question': row['question'],
            'likes': row['likes'],
            'likers': likers_list,
            'created_at': row['created_at'],
            'password': row['password']  # 삭제 시 클라이언트에서 참고할 수 있도록 포함 (보안에 민감하지 않은 내부 용도라 가정)
        })
    conn.close()
    return jsonify(questions)

# 공감(좋아요) API
@app.route('/api/questions/<int:question_id>/like', methods=['POST'])
def like_question(question_id):
    data = request.get_json()
    likerName = data.get('likerName')
    if not likerName:
        return jsonify({'error': 'likerName이 필요합니다.'}), 400
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM questions WHERE id = ?', (question_id,))
    row = c.fetchone()
    if row is None:
        conn.close()
        return jsonify({'error': '질문을 찾을 수 없습니다.'}), 404
    
    # 이미 공감했는지 확인 (콤마로 구분된 문자열 처리)
    likers = row['likers']
    likers_list = likers.split(',') if likers else []
    if likerName in likers_list:
        conn.close()
        return jsonify({'error': '이미 공감하셨습니다.'}), 400
    
    new_likers_list = likers_list + [likerName]
    new_likers_str = ','.join(new_likers_list)
    new_likes = row['likes'] + 1
    c.execute('UPDATE questions SET likes = ?, likers = ? WHERE id = ?', (new_likes, new_likers_str, question_id))
    conn.commit()
    conn.close()
    return jsonify({'message': '공감이 등록되었습니다.'})

# 질문 삭제 API (비밀번호 검증)
@app.route('/api/questions/<int:question_id>', methods=['DELETE'])
def delete_question(question_id):
    data = request.get_json()
    provided_password = data.get('password')
    if not provided_password:
        return jsonify({'error': '비밀번호가 필요합니다.'}), 400
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('SELECT * FROM questions WHERE id = ?', (question_id,))
    row = c.fetchone()
    if row is None:
        conn.close()
        return jsonify({'error': '질문을 찾을 수 없습니다.'}), 404
    
    # 입력된 비밀번호가 질문 등록 시 입력한 비밀번호와 일치하거나 관리자 번호(1594)인 경우 삭제
    if provided_password == row['password'] or provided_password == "1594":
        c.execute('DELETE FROM questions WHERE id = ?', (question_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': '질문이 삭제되었습니다.'})
    else:
        conn.close()
        return jsonify({'error': '비밀번호가 일치하지 않습니다.'}), 403

if __name__ == '__main__':
    app.run(debug=True)
