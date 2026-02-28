/* =====================================================
   GUVI — Register Page JavaScript
   Interactive form with confetti, shake, ripple, progress ring
   ===================================================== */

$(document).ready(function () {

    // ── Redirect if already logged in ──
    if (localStorage.getItem('guvi_token')) {
        window.location.href = 'profile.html';
        return;
    }

    // ── Toast Notification (with progress bar) ──
    function showToast(message, type = 'info', duration = 4500) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        const $toast = $('<div class="toast ' + type + '">' +
            '<i class="bi ' + icons[type] + '"></i>' +
            '<span>' + message + '</span>' +
            '<div class="toast-progress" style="animation-duration:' + duration + 'ms"></div>' +
            '</div>');
        $('#toast-container').append($toast);
        setTimeout(function () {
            $toast.addClass('removing');
            setTimeout(function () { $toast.remove(); }, 300);
        }, duration);
    }

    // ── Confetti Burst ──
    function launchConfetti() {
        const colors = ['#00C853', '#2EE66D', '#69F0AE', '#FFC107', '#2196F3', '#FF5252'];
        for (let i = 0; i < 80; i++) {
            const $piece = $('<div class="confetti-piece"></div>').css({
                left: (40 + Math.random() * 20) + '%',
                top: '-10px',
                background: colors[Math.floor(Math.random() * colors.length)],
                width: (Math.random() * 8 + 5) + 'px',
                height: (Math.random() * 8 + 5) + 'px',
                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                animationDuration: (Math.random() * 1.5 + 1.5) + 's',
                animationDelay: (Math.random() * 0.5) + 's',
                transform: 'rotate(' + (Math.random() * 360) + 'deg)'
            });
            $('body').append($piece);
            setTimeout(function () { $piece.remove(); }, 4000);
        }
    }

    // ── Shake Element ──
    function shake($el) {
        $el.addClass('shake');
        setTimeout(function () { $el.removeClass('shake'); }, 500);
    }

    // ── Ripple on buttons ──
    $(document).on('click', '.btn', function (e) {
        const $btn = $(this);
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const $ripple = $('<span class="ripple"></span>').css({
            width: size + 'px', height: size + 'px',
            left: (e.clientX - rect.left - size / 2) + 'px',
            top: (e.clientY - rect.top - size / 2) + 'px'
        });
        $btn.append($ripple);
        setTimeout(function () { $ripple.remove(); }, 600);
    });

    // ── Focus Pulse ──
    $(document).on('focus', '.form-control', function () {
        $(this).addClass('focus-pulse');
        const $this = $(this);
        setTimeout(function () { $this.removeClass('focus-pulse'); }, 300);
    });

    // ── Form Progress Bar ──
    function updateFormProgress() {
        const fields = ['#email', '#password', '#confirmPassword'];
        let filled = 0;
        fields.forEach(function (sel) {
            if ($(sel).val() && $(sel).val().trim()) filled++;
        });
        const pct = Math.round((filled / fields.length) * 100);
        $('#formProgress').css('width', pct + '%');
    }
    $(document).on('input', '.form-control', function () { updateFormProgress(); });

    // ── Password Visibility Toggle ──
    $('.toggle-btn').click(function () {
        const targetId = $(this).data('target');
        const $input = $('#' + targetId);
        const $icon = $(this).find('i');
        if ($input.attr('type') === 'password') {
            $input.attr('type', 'text');
            $icon.removeClass('bi-eye-slash').addClass('bi-eye');
        } else {
            $input.attr('type', 'password');
            $icon.removeClass('bi-eye').addClass('bi-eye-slash');
        }
    });

    // ── Email Validation ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    $('#email').on('input', function () {
        const val = $(this).val().trim();
        const $hint = $('#emailHint');
        if (!val) {
            $(this).removeClass('is-valid is-invalid');
            $hint.text('').removeClass('error success');
        } else if (emailRegex.test(val)) {
            $(this).removeClass('is-invalid').addClass('is-valid');
            $hint.text('Looks good!').removeClass('error').addClass('success');
        } else {
            $(this).removeClass('is-valid').addClass('is-invalid');
            $hint.text('Please enter a valid email address.').removeClass('success').addClass('error');
        }
    });

    // ── Password Strength Checker ──
    function checkPasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            upper: /[A-Z]/.test(password),
            lower: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };

        Object.values(checks).forEach(function (v) { if (v) score++; });

        // Update requirements with animation
        $.each(checks, function (key, met) {
            const $req = $('[data-req="' + key + '"]');
            if (met && !$req.hasClass('met')) {
                $req.addClass('met');
                $req.find('i').removeClass('bi-circle').addClass('bi-check-circle-fill');
                // Small pop animation
                $req.css('transform', 'scale(1.1)');
                setTimeout(function () { $req.css('transform', ''); }, 200);
            } else if (!met) {
                $req.removeClass('met');
                $req.find('i').removeClass('bi-check-circle-fill').addClass('bi-circle');
            }
        });

        return { score: score, checks: checks };
    }

    // ── Update Progress Ring ──
    function updateProgressRing(score) {
        const $ring = $('#strengthRing');
        if (!$ring.length) return;
        const pct = (score / 5) * 100;
        const circumference = 2 * Math.PI * 18; // r=18
        const offset = circumference - (pct / 100) * circumference;
        $ring.find('.fg').css('stroke-dashoffset', offset);
        $ring.find('.pct').text(Math.round(pct) + '%');
        // Color change
        const colors = ['', 'var(--error)', 'var(--error)', '#F97316', 'var(--warning)', 'var(--success)'];
        $ring.find('.fg').css('stroke', colors[score] || 'var(--gray-300)');
    }

    $('#password').on('input', function () {
        const val = $(this).val();
        const $bar = $('#strengthBar');
        const $text = $('#strengthText');

        if (!val) {
            $bar.removeAttr('class').addClass('bar');
            $text.text('').css('color', '');
            $(this).removeClass('is-valid is-invalid');
            $('[data-req]').removeClass('met').find('i').removeClass('bi-check-circle-fill').addClass('bi-circle');
            updateProgressRing(0);
            return;
        }

        const result = checkPasswordStrength(val);
        const levels = [
            { cls: '', text: '', color: '' },
            { cls: 'weak', text: 'Weak', color: 'var(--error)' },
            { cls: 'weak', text: 'Weak', color: 'var(--error)' },
            { cls: 'fair', text: 'Fair', color: '#F97316' },
            { cls: 'good', text: 'Good', color: 'var(--accent)' },
            { cls: 'strong', text: 'Strong', color: 'var(--success)' }
        ];

        const level = levels[result.score] || levels[1];
        $bar.removeAttr('class').addClass('bar ' + level.cls);
        $text.text(level.text).css('color', level.color);
        updateProgressRing(result.score);

        if (result.score >= 4) {
            $(this).removeClass('is-invalid').addClass('is-valid');
        } else if (result.score <= 2) {
            $(this).removeClass('is-valid').addClass('is-invalid');
        } else {
            $(this).removeClass('is-valid is-invalid');
        }

        // Re-check confirm password match
        const confirmVal = $('#confirmPassword').val();
        if (confirmVal) $('#confirmPassword').trigger('input');
    });

    // ── Confirm Password Match ──
    $('#confirmPassword').on('input', function () {
        const val = $(this).val();
        const passVal = $('#password').val();
        const $hint = $('#confirmHint');

        if (!val) {
            $(this).removeClass('is-valid is-invalid');
            $hint.text('').removeClass('error success');
        } else if (val === passVal) {
            $(this).removeClass('is-invalid').addClass('is-valid');
            $hint.text('Passwords match!').removeClass('error').addClass('success');
        } else {
            $(this).removeClass('is-valid').addClass('is-invalid');
            $hint.text('Passwords do not match.').removeClass('success').addClass('error');
        }
    });

    // ── Form Submit ──
    $('#registerForm').on('submit', function (e) {
        e.preventDefault();

        const email = $('#email').val().trim();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();

        // Validate with shake feedback
        if (!email || !password || !confirmPassword) {
            showToast('Please fill in all fields.', 'warning');
            if (!email) shake($('#email'));
            if (!password) shake($('#password'));
            if (!confirmPassword) shake($('#confirmPassword'));
            return;
        }
        if (!emailRegex.test(email)) {
            showToast('Please enter a valid email address.', 'error');
            shake($('#email').closest('.form-group'));
            $('#email').focus();
            return;
        }
        if (password.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            shake($('#password').closest('.form-group'));
            $('#password').focus();
            return;
        }
        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            shake($('#confirmPassword').closest('.form-group'));
            $('#confirmPassword').focus();
            return;
        }

        // Set loading state
        const $btn = $('#submitBtn');
        $btn.addClass('btn-loading');
        $btn.find('.spinner').show();

        // AJAX Register
        $.ajax({
            url: 'php/register.php',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                email: email,
                password: password,
                confirm_password: confirmPassword
            }),
            dataType: 'json',
            success: function (res) {
                if (res.success) {
                    launchConfetti();
                    showToast('Account created! Redirecting to login...', 'success');
                    // Store email for login pre-fill
                    sessionStorage.setItem('guvi_registered_email', email);
                    setTimeout(function () {
                        window.location.href = 'login.html';
                    }, 2000);
                } else {
                    showToast(res.message || 'Registration failed.', 'error');
                    shake($('#registerForm'));
                }
            },
            error: function (xhr) {
                let msg = 'Something went wrong. Please try again.';
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.message) msg = res.message;
                } catch (e) {}
                showToast(msg, 'error');
                shake($('#registerForm'));
            },
            complete: function () {
                $btn.removeClass('btn-loading');
                $btn.find('.spinner').hide();
            }
        });
    });

    // ── Mobile Nav Toggle ──
    $('#navToggle').click(function () {
        $('#navLinks').toggleClass('show');
    });

});
