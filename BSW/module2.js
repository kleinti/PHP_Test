const Question = require("../models/Question");
const Result = require("../models/Result");
const Quiz = require("../models/Quiz");
const userController = require("./userController");
const authService  = require('../services/authService');


// Private function to shuffle an array
function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

// Post question Controller
module.exports.addQuestion_post = async (req, res) => {
    console.log('POST request to add question received, body:');
    console.log(req.body);

    try 
    {
        const { questionType, questionText, assignToCurrentQuiz} = req.body;
        const {groupId, userId} = await authService.getRequesterInfo(req);
        let quiz = null;

        if (assignToCurrentQuiz){
            quiz = await Quiz.currentQuiz(groupId);
        }
        let user = userId; 
        if (quiz && quiz.status === 'notStarted'){  // question shall be assigned to current quiz.
            quiz = quiz._id;

            if (questionType === 'multipleChoice') {
                const {multipleChoiceAnswers, multipleChoiceCorrectAnswer} = req.body;
                const multipleChoiceAnswerDisplayOrder = shuffle([0, 1, 2, 3]);
                const question = await Question.create({ user, quiz, questionType, questionText, multipleChoiceCorrectAnswer, multipleChoiceAnswers, multipleChoiceAnswerDisplayOrder});
                res.status(200).json(question);
            }
            else {
                const {estimationCorrectAnswer} = req.body;
                const question = await Question.create({ user, quiz, questionType, questionText, estimationCorrectAnswer});
                res.status(200).json(question);
            }   
        }
        else { //  question shall not be assigned to current quiz.            
            if (questionType === 'multipleChoice') {
                const {multipleChoiceAnswers, multipleChoiceCorrectAnswer} = req.body;
                const multipleChoiceAnswerDisplayOrder = shuffle([0, 1, 2, 3]);
                const question = await Question.create({ user, questionType, questionText, multipleChoiceCorrectAnswer, multipleChoiceAnswers, multipleChoiceAnswerDisplayOrder});
                res.status(200).json(question);
            }
            else {
                const {estimationCorrectAnswer} = req.body;
                const question = await Question.create({ user, questionType, questionText, estimationCorrectAnswer});
                res.status(200).json(question);
            }    
        }    
    }
    catch (err) {
        console.log('Error when executing method addQuestion_post: ', err);
        res.status(400).send();
    } 
}


// Get question controller
module.exports.question_get = async (req, res) => {
    console.log('GET request for question received.');    
    console.log('ID Parameter:', req.params.id);    
    console.log('Query Object:', req.query);    
    
    try {

        // Get question by id
        if (req.params.id) {   
        try {        
            const question = await Question.findById(req.params.id);        
            res.status(200).json(question);
        }
        catch {
            console.log(err);
            res.status(400).send('User not found');
        }
        } 
        else {

        // Get question by query string
            if (Object.entries(req.query).length) {
                try {
                    queryObject = {            
                        user: req.query.user || null,
                        quiz: req.query.quiz || null,
                        questionType: req.query.questionType || null
                    }
            
                    // removes falsey params
                    Object.keys(queryObject).forEach((key) => (queryObject[key] == null) && delete queryObject[key]);         
                    const questions = await Question.find(queryObject);          
                    res.status(200).json(questions);        
                }
                catch (err) {
                    console.log(err);
                    res.status(400).send();
                }
                
            }
            else {

        // Get all questions
                Question.find().populate("user quiz").exec((err,questions) => {
                    if (err) {
                        console.log(err);
                        res.status(400).send();
                    }
                    else {
                        res.status(200).json(questions);
                    }
                });
            }
        }
    }
    catch (err) {
        console.log("Error when executing question_get: ", err);
        res.status(400).send('Error when executing question_get.');
    }
}

// Delete controller 
module.exports.question_delete = async (req, res) => {
    const id = req.params.id;
    console.log(`DELETE request received for question %s`, id);
    Question.findByIdAndRemove(id, function (err, question) {
        if (err) {
            console.log(err);
            res.status(400).send();
        }
        else {
            if (question == null) {
                res.status(400).send('question not found in data base.');
            }
            else {
                res.status(200).send(question);
            }
        }
    });
}

// PUT / Update question controller
module.exports.question_put = async (req, res) => {
    console.log('PUT request for question received.');
    const update = req.body;
    console.log('body:', req.body);
    const options = {new : true};
    Question.findByIdAndUpdate(req.params.id, update, options).exec(async (err, question) => {
        if (err) {
            console.log('Error when executing question_put:', err);
            res.status(400).send();
        }
        else {
            // await Result.updateNumberPostedQuestions(quiz._id);
            res.status(200).json(question);
        }
    });
}

module.exports.deactivateQuestion_get = async (req, res) => {
    console.log('Requst to deactivate question:', req.params.id);
    const update = {quiz : undefined};
    const options = {new : true};
    Question.findByIdAndUpdate(req.params.id, update, options).exec(async (err, question) => {
        if (err) {
            console.log('Error when executing deactivateQuestion_get:', err);
            res.status(400).send();
        }
        else {
            // await Result.updateNumberPostedQuestions(quiz._id)
            res.status(200).json(question);
        }
    });
}

module.exports.activateQuestion_get = async (req, res) => {
    console.log('Requst to activate question:', req.params.id);
    const {groupId} = await authService.getRequesterInfo(req);
    const quiz = await Quiz.currentQuiz(groupId);    
    const update = {quiz : quiz._id};
    const options = {new : true};
    Question.findByIdAndUpdate(req.params.id, update, options).exec(async (err, question) => {
        if (err) {
            console.log('Error when executing deactivateQuestion_get:', err);
            res.status(400).send();
        }
        else {
            // await Result.updateNumberPostedQuestions(quiz._id);
            res.status(200).json(question);
        }
    });
}

// Controller to assign all open not assigned questions to to current quiz
module.exports.activateOpenQuestions_get = async (req, res) => {
    console.log('Requst to activate all open questions');
    try {
        const {groupId, userId} = await authService.getRequesterInfo(req);
        const quiz = await Quiz.currentQuiz(groupId);    
        const queryObj = {user : userId, quiz : null};    
        const updateObj = {quiz : quiz._id};
        if (quiz && quiz.status === 'notStarted'){
            let questions = await Question.find(queryObj);
            console.log('questions:', questions)
            questions.forEach(async (question) => {
                question.quiz = quiz._id;
                await question.save();
            });
            console.log(questions.length + ' questions assigned to current quiz.')
            res.status(200).json(questions);        
        }
        else {
            res.status(400).send('Current quiz not found or not in notStarted state.');
        }
    }
    catch (err) {
        console.log('Error when executing activateOpenQuestions_get:', err);
        res.status(400).send('Error when executing activateOpenQuestions_get.');
    }
    
    
}


// My open questions: Controller to provide all unraised question from user
module.exports.myOpenQuestions_get = async (req, res) => {   
    try { 
        const {groupId, user} = await authService.getRequesterInfo(req);
        const currentQuiz = await Quiz.currentQuiz(groupId);
        if (user) {
            const queryObj ={
                user : user, 
                $or : [{quiz : currentQuiz}, {quiz : null}]
            };        
            Question.find(queryObj).exec( (err, questions) => {
                if (err){
                    console.log('Error when executing myOpenQuestions_get:', err);
                    res.status(400).send();
                }
                else {
                    res.status(200).json(questions);
                }
            });
        }
        else {
            res.status(400).send('Requesting user not found. Check login status.');
        }
    }
    catch (err) {
        console.log("Error when executing myOpenQuestions_get: ", err);
        res.status(400).send('Error when executing myOpenQuestions_get.');
    }

}