const trainerNames = ["안도영", "서지향", "서상훈", "이동훈", "여승환", "신동민", "설상백", "이예진", "윤여진", "이재원"];
let questions = [];

// 서버에서 질문 목록 가져오기
async function fetchQuestions() {
    try {
        const response = await fetch('/api/questions');
        const data = await response.json();
        questions = data;
        displayQuestions();
    } catch (error) {
        console.error('질문 목록을 가져오는데 실패했습니다:', error);
    }
}

// 페이지 로드 시 질문 목록 가져오기
window.addEventListener('load', fetchQuestions);

// 질문 등록
document.getElementById("registerBtn").addEventListener("click", async () => {
    const questionText = document.getElementById("question").value.trim();
    const password = document.getElementById("password").value.trim();

    if (questionText && password.length === 4 && !isNaN(password)) {
        try {
            const response = await fetch('/api/questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: questionText,
                    password: password
                })
            });

            if (response.ok) {
                document.getElementById("question").value = '';
                document.getElementById("password").value = '';
                await fetchQuestions();
            } else {
                alert('질문 등록에 실패했습니다.');
            }
        } catch (error) {
            console.error('질문 등록 중 오류 발생:', error);
            alert('질문 등록 중 오류가 발생했습니다.');
        }
    } else {
        alert("질문을 입력하고 비밀번호를 4자리 숫자로 입력해주세요.");
    }
});

// 공감 버튼 클릭 시 (서버에 요청)
async function handleLike(questionId) {
    const likerName = document.getElementById(`likerName-${questionId}`).value;
    if (likerName === "선택해주세요") {
        alert("이름을 선택해주세요!");
        return;
    }
    try {
        const response = await fetch(`/api/questions/${questionId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                likerName: likerName
            })
        });
        if (response.ok) {
            await fetchQuestions();
        } else {
            const errorData = await response.json();
            alert(errorData.error || "이미 공감하셨습니다.");
        }
    } catch (error) {
        console.error('공감 처리 중 오류 발생:', error);
        alert('공감 처리 중 오류가 발생했습니다.');
    }
}

// 질문 삭제 (서버에 DELETE 요청)
async function deleteQuestion(questionId) {
    const providedPassword = prompt("비밀번호를 입력해주세요.");
    if (!providedPassword) {
        return;
    }
    try {
        const response = await fetch(`/api/questions/${questionId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                password: providedPassword
            })
        });
        if (response.ok) {
            await fetchQuestions();
        } else {
            const errorData = await response.json();
            alert(errorData.error || "삭제 실패");
        }
    } catch (error) {
        console.error('질문 삭제 중 오류 발생:', error);
        alert('질문 삭제 중 오류가 발생했습니다.');
    }
}

// 질문 목록 출력
function displayQuestions() {
    const questionListContainer = document.getElementById("questionList");
    questionListContainer.innerHTML = "";
    questions.forEach(question => {
        const questionElement = document.createElement("div");
        questionElement.classList.add("question-container");

        const questionText = document.createElement("p");
        questionText.textContent = question.question;

        const likeButton = document.createElement("button");
        likeButton.textContent = "저도 궁금해요";
        likeButton.addEventListener("click", () => handleLike(question.id));

        const likerSelect = document.createElement("select");
        likerSelect.id = `likerName-${question.id}`;
        const defaultOption = document.createElement("option");
        defaultOption.textContent = "선택해주세요";
        likerSelect.appendChild(defaultOption);
        trainerNames.forEach(name => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            likerSelect.appendChild(option);
        });

        const likesCount = document.createElement("p");
        likesCount.textContent = `공감 수: ${question.likes}`;
        if (question.likers.length > 0 && question.likers[0] !== "") {
            likesCount.textContent += ` (${question.likers.join(', ')})`;
        }

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "삭제";
        deleteButton.classList.add("delete-btn");
        deleteButton.addEventListener("click", () => deleteQuestion(question.id));

        questionElement.appendChild(questionText);
        questionElement.appendChild(likeButton);
        questionElement.appendChild(likerSelect);
        questionElement.appendChild(likesCount);
        questionElement.appendChild(deleteButton);

        questionListContainer.appendChild(questionElement);
    });
}
